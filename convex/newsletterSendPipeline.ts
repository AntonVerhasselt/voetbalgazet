import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  collectArticleSlugs,
  replaceArticleLinks,
  replacePreferencesLinks,
} from "./lib/newsletterContentLinks";
import { buildAudienceEngagementContext } from "./lib/audienceEngagement";
import { resolveRuleGroups, type DivisionMeta } from "./lib/audienceRules";
import {
  decodeEligibilityCursor,
  encodeEligibilityCursor,
  subscriberCanReceiveNewsletter,
  subscriberMatchesAudienceFilters,
} from "./lib/newsletterEligibility";
import {
  markEmailMediaUsedByHtml,
  siteBaseUrl,
} from "./lib/newsletterSendShared";
import {
  ARTICLE_ACCESS_TTL_MS,
  PREFERENCES_ACCESS_TTL_MS,
  UNSUBSCRIBE_TTL_MS,
} from "./lib/emailLinkToken";
import { mintEmailLinkToken } from "./lib/emailLinkTokensDb";
import { assertMarketingSendEnabled } from "./lib/runtimeSettings";
import { hasActiveSuppression } from "./lib/suppressions";
import { resend } from "./resendClient";

const PREPARE_BATCH = 100;
const ENQUEUE_BATCH = 50;
const COUNT_BATCH = 1000;

export const executeScheduledSend = internalMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    scheduleGeneration: v.number(),
    clientRequestId: v.string(),
    expectedPreviewCount: v.number(),
    revisionId: v.id("newsletterRevisions"),
    audienceDefinitionId: v.id("newsletterAudienceDefinitions"),
    requestedBy: v.id("users"),
    analyticsId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return null;
    }
    if (
      campaign.status !== "scheduled" ||
      campaign.scheduleGeneration !== args.scheduleGeneration
    ) {
      return null;
    }
    const existing = await ctx.db
      .query("newsletterSends")
      .withIndex("by_clientRequestId", (q) =>
        q.eq("clientRequestId", args.clientRequestId),
      )
      .unique();
    if (existing) {
      return null;
    }

    const now = Date.now();
    const sendId = await ctx.db.insert("newsletterSends", {
      campaignId: args.campaignId,
      revisionId: args.revisionId,
      audienceDefinitionId: args.audienceDefinitionId,
      status: "preparing",
      analyticsId: args.analyticsId,
      requestedBy: args.requestedBy,
      requestedAt: now,
      scheduledFor: campaign.scheduledFor,
      queuedCount: 0,
      deliveredCount: 0,
      bouncedCount: 0,
      complainedCount: 0,
      failedCount: 0,
      suppressedCount: 0,
      openedCount: 0,
      clickedCount: 0,
      clientRequestId: args.clientRequestId,
      expectedRecipientCount: args.expectedPreviewCount,
    });
    await ctx.db.patch(args.campaignId, {
      status: "preparing",
      sendRequestedAt: now,
      sendRequestedBy: args.requestedBy,
    });
    await ctx.scheduler.runAfter(0, internal.newsletterAdmin.dispatchAdminSendAlert, {
      campaignId: args.campaignId,
      sendId,
      status: "started",
    });
    await ctx.scheduler.runAfter(0, internal.newsletterSendPipeline.prepareRecipients, {
      sendId,
      cursor: null,
    });
    return null;
  },
});

export const listEligibleSubscriberPage = internalQuery({
  args: {
    audienceDefinitionId: v.id("newsletterAudienceDefinitions"),
    now: v.number(),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  returns: v.object({
    subscriberIds: v.array(v.id("subscribers")),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const definition = await ctx.db.get(args.audienceDefinitionId);
    if (!definition) {
      return { subscriberIds: [], continueCursor: null, isDone: true };
    }
    const decodedCursor = decodeEligibilityCursor(args.paginationOpts.cursor);
    const subscriberIds: Id<"subscribers">[] = [];
    const now = args.now;
    const divisions = await ctx.db.query("divisions").take(500);
    const divisionMetaById = new Map<string, DivisionMeta>();
    for (const division of divisions) {
      divisionMetaById.set(division._id, {
        _id: division._id,
        label: division.label,
        provinceKey: division.provinceKey,
        level: division.level,
      });
    }
    const engagement = await buildAudienceEngagementContext(
      ctx,
      resolveRuleGroups(definition),
    );

    if (definition.divisionIds.length > 0) {
      let divisionIndex =
        decodedCursor?.mode === "division" ? decodedCursor.index : 0;
      let divisionCursor =
        decodedCursor?.mode === "division" ? decodedCursor.cursor : null;
      while (
        subscriberIds.length < args.paginationOpts.numItems &&
        divisionIndex < definition.divisionIds.length
      ) {
        const divisionId = definition.divisionIds[divisionIndex];
        if (!divisionId) {
          divisionIndex += 1;
          divisionCursor = null;
          continue;
        }
        const preferencePage = await ctx.db
          .query("subscriberDivisionPreferences")
          .withIndex("by_division_and_subscriber", (q) =>
            q.eq("divisionId", divisionId),
          )
          .paginate({
            numItems: args.paginationOpts.numItems - subscriberIds.length,
            cursor: divisionCursor,
          });
        for (const preference of preferencePage.page) {
          const subscriber = await ctx.db.get(preference.subscriberId);
          if (
            subscriber &&
            (await subscriberCanReceiveNewsletter(ctx, subscriber)) &&
            subscriberMatchesAudienceFilters(
              subscriber,
              definition,
              divisionMetaById,
              now,
              engagement,
              { divisionAlreadyMatched: true },
            )
          ) {
            subscriberIds.push(subscriber._id);
          }
        }
        if (preferencePage.isDone) {
          divisionIndex += 1;
          divisionCursor = null;
        } else {
          divisionCursor = preferencePage.continueCursor;
          break;
        }
      }
      const isDone = divisionIndex >= definition.divisionIds.length;
      return {
        subscriberIds,
        continueCursor: isDone
          ? null
          : encodeEligibilityCursor({
              mode: "division",
              index: divisionIndex,
              cursor: divisionCursor,
            }),
        isDone,
      };
    }

    if (definition.favoriteTeamIds.length > 0) {
      let teamIndex = decodedCursor?.mode === "team" ? decodedCursor.index : 0;
      let teamCursor = decodedCursor?.mode === "team" ? decodedCursor.cursor : null;
      while (
        subscriberIds.length < args.paginationOpts.numItems &&
        teamIndex < definition.favoriteTeamIds.length
      ) {
        const teamId = definition.favoriteTeamIds[teamIndex];
        if (!teamId) {
          teamIndex += 1;
          teamCursor = null;
          continue;
        }
        const teamPage = await ctx.db
          .query("subscribers")
          .withIndex("by_favorite_team_and_newsletter", (q) =>
            q.eq("favoriteTeamId", teamId).eq("newsletterSubscribed", true),
          )
          .paginate({
            numItems: args.paginationOpts.numItems - subscriberIds.length,
            cursor: teamCursor,
          });
        for (const subscriber of teamPage.page) {
          if (
            (await subscriberCanReceiveNewsletter(ctx, subscriber)) &&
            subscriberMatchesAudienceFilters(
              subscriber,
              definition,
              divisionMetaById,
              now,
              engagement,
            )
          ) {
            subscriberIds.push(subscriber._id);
          }
        }
        if (teamPage.isDone) {
          teamIndex += 1;
          teamCursor = null;
        } else {
          teamCursor = teamPage.continueCursor;
          break;
        }
      }
      const isDone = teamIndex >= definition.favoriteTeamIds.length;
      return {
        subscriberIds,
        continueCursor: isDone
          ? null
          : encodeEligibilityCursor({
              mode: "team",
              index: teamIndex,
              cursor: teamCursor,
            }),
        isDone,
      };
    }

    const subscribedPage = await ctx.db
      .query("subscribers")
      .withIndex("by_newsletter_subscribed", (q) =>
        q.eq("newsletterSubscribed", true),
      )
      .paginate({
        numItems: args.paginationOpts.numItems,
        cursor:
          decodedCursor?.mode === "subscribed"
            ? decodedCursor.cursor
            : args.paginationOpts.cursor,
      });
    for (const subscriber of subscribedPage.page) {
      if (
        (await subscriberCanReceiveNewsletter(ctx, subscriber)) &&
        subscriberMatchesAudienceFilters(
          subscriber,
          definition,
          divisionMetaById,
          now,
          engagement,
        )
      ) {
        subscriberIds.push(subscriber._id);
      }
    }
    return {
      subscriberIds,
      continueCursor: subscribedPage.isDone
        ? null
        : encodeEligibilityCursor({
            mode: "subscribed",
            cursor: subscribedPage.continueCursor,
          }),
      isDone: subscribedPage.isDone,
    };
  },
});

export const countPreparedRecipientsPage = internalQuery({
  args: {
    sendId: v.id("newsletterSends"),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    count: v.number(),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("newsletterRecipients")
      .withIndex("by_send_and_status", (q) =>
        q.eq("sendId", args.sendId).eq("status", "prepared"),
      )
      .paginate({ numItems: COUNT_BATCH, cursor: args.cursor });
    return {
      count: page.page.length,
      continueCursor: page.isDone ? null : page.continueCursor,
      isDone: page.isDone,
    };
  },
});

type PreparedRecipientsCountPage = {
  count: number;
  continueCursor: string | null;
  isDone: boolean;
};

async function countPreparedRecipients(
  ctx: MutationCtx,
  sendId: Id<"newsletterSends">,
): Promise<number> {
  let count = 0;
  let cursor: string | null = null;
  let isDone = false;
  while (!isDone) {
    const page: PreparedRecipientsCountPage = await ctx.runQuery(
      internal.newsletterSendPipeline.countPreparedRecipientsPage,
      { sendId, cursor },
    );
    count += page.count;
    isDone = page.isDone;
    cursor = page.continueCursor;
  }
  return count;
}

export const prepareRecipients = internalMutation({
  args: {
    sendId: v.id("newsletterSends"),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const send = await ctx.db.get(args.sendId);
    if (!send || send.status !== "preparing") {
      return null;
    }
    const now = Date.now();
    const page = await ctx.runQuery(
      internal.newsletterSendPipeline.listEligibleSubscriberPage,
      {
        audienceDefinitionId: send.audienceDefinitionId,
        now,
        paginationOpts: {
          numItems: PREPARE_BATCH,
          cursor: args.cursor,
        },
      },
    );

    for (const subscriberId of page.subscriberIds) {
      const idempotencyKey = `newsletter:${args.sendId}:${subscriberId}`;
      const existing = await ctx.db
        .query("newsletterRecipients")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", idempotencyKey),
        )
        .unique();
      if (existing) {
        continue;
      }
      await ctx.db.insert("newsletterRecipients", {
        sendId: args.sendId,
        campaignId: send.campaignId,
        subscriberId,
        status: "prepared",
        idempotencyKey,
        createdAt: now,
      });
    }

    if (!page.isDone) {
      await ctx.db.patch(args.sendId, {
        preparationCursor: page.continueCursor ?? undefined,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.newsletterSendPipeline.prepareRecipients,
        {
          sendId: args.sendId,
          cursor: page.continueCursor,
        },
      );
      return null;
    }

    const preparedCount = await countPreparedRecipients(ctx, args.sendId);

    if (preparedCount === 0) {
      await ctx.db.patch(args.sendId, {
        status: "failed",
        lastErrorCode: "AUDIENCE_EMPTY",
        completedAt: now,
        expectedRecipientCount: 0,
      });
      await ctx.db.patch(send.campaignId, {
        status: "failed",
        recipientCount: 0,
      });
      await ctx.scheduler.runAfter(0, internal.newsletterAdmin.dispatchAdminSendAlert, {
        campaignId: send.campaignId,
        sendId: args.sendId,
        status: "failed",
      });
      return null;
    }

    await ctx.db.patch(args.sendId, {
      status: "sending",
      expectedRecipientCount: preparedCount,
    });
    await ctx.db.patch(send.campaignId, {
      status: "sending",
      recipientCount: preparedCount,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.newsletterSendPipeline.enqueueRecipientBatch,
      { sendId: args.sendId, cursor: null },
    );
    return null;
  },
});

async function finalizeQueuedSend(
  ctx: MutationCtx,
  send: Doc<"newsletterSends">,
): Promise<void> {
  const current = await ctx.db.get(send._id);
  if (!current) {
    return;
  }
  // Nothing queued -> failed; queued plus failures -> partially failed; else sent.
  const finalStatus: Doc<"newsletterSends">["status"] =
    current.queuedCount === 0
      ? "failed"
      : current.failedCount > 0
        ? "partially_failed"
        : "sent";
  const now = Date.now();
  await ctx.db.patch(send._id, {
    status: finalStatus,
    completedAt: now,
    ...(finalStatus === "failed" && current.queuedCount === 0
      ? {
          lastErrorCode:
            current.suppressedCount > 0 && current.failedCount === 0
              ? "ALL_SUPPRESSED"
              : current.lastErrorCode ?? "NOTHING_QUEUED",
        }
      : {}),
  });
  await ctx.db.patch(send.campaignId, {
    status: finalStatus,
    ...(finalStatus !== "failed" ? { sentAt: now } : {}),
  });
  await ctx.scheduler.runAfter(0, internal.newsletterAdmin.dispatchAdminSendAlert, {
    campaignId: send.campaignId,
    sendId: send._id,
    status: finalStatus,
  });
}

export const enqueueRecipientBatch = internalMutation({
  args: {
    sendId: v.id("newsletterSends"),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const send = await ctx.db.get(args.sendId);
    if (!send || send.status !== "sending") {
      return null;
    }
    try {
      await assertMarketingSendEnabled(ctx);
    } catch {
      // Do not rethrow: Convex rolls back patches if the mutation throws.
      const now = Date.now();
      await ctx.db.patch(args.sendId, {
        status: "failed",
        lastErrorCode: "MARKETING_KILL_SWITCH",
        completedAt: now,
      });
      await ctx.db.patch(send.campaignId, {
        status: "failed",
      });
      await ctx.scheduler.runAfter(0, internal.newsletterAdmin.dispatchAdminSendAlert, {
        campaignId: send.campaignId,
        sendId: args.sendId,
        status: "failed",
      });
      return null;
    }
    const revision = await ctx.db.get(send.revisionId);
    const campaign = await ctx.db.get(send.campaignId);
    const sender = campaign
      ? await ctx.db.get(campaign.senderProfileId)
      : null;
    if (!revision || !campaign || !sender) {
      await ctx.db.patch(args.sendId, {
        status: "failed",
        lastErrorCode: "MISSING_REVISION",
        completedAt: Date.now(),
      });
      return null;
    }

    const page = await ctx.db
      .query("newsletterRecipients")
      .withIndex("by_send_and_status", (q) =>
        q.eq("sendId", args.sendId).eq("status", "prepared"),
      )
      .paginate({ numItems: ENQUEUE_BATCH, cursor: args.cursor });
    const batch = page.page;

    if (batch.length === 0) {
      if (!page.isDone) {
        await ctx.scheduler.runAfter(
          0,
          internal.newsletterSendPipeline.enqueueRecipientBatch,
          { sendId: args.sendId, cursor: page.continueCursor },
        );
        return null;
      }
      await finalizeQueuedSend(ctx, send);
      return null;
    }

    let queuedDelta = 0;
    let failedDelta = 0;
    let suppressedDelta = 0;

    for (const recipient of batch) {
      const subscriber = await ctx.db.get(recipient.subscriberId);
      if (!subscriber) {
        await ctx.db.patch(recipient._id, {
          status: "failed",
          errorCode: "SUBSCRIBER_MISSING",
          failedAt: Date.now(),
        });
        failedDelta += 1;
        continue;
      }
      if (
        !subscriber.newsletterSubscribed ||
        (await hasActiveSuppression(ctx, {
          subscriberId: subscriber._id,
          normalizedEmail: subscriber.normalizedEmail,
        }))
      ) {
        await ctx.db.patch(recipient._id, {
          status: "suppressed",
          exclusionReason: "final_check",
        });
        suppressedDelta += 1;
        continue;
      }

      try {
        const now = Date.now();
        const siteBase = siteBaseUrl();
        const unsubscribeToken = await mintEmailLinkToken(ctx, {
          purpose: "newsletter_unsubscribe",
          subscriberId: subscriber._id,
          expiresAt: now + UNSUBSCRIBE_TTL_MS,
          sendId: send._id,
          campaignId: send.campaignId,
        });
        const preferencesToken = await mintEmailLinkToken(ctx, {
          purpose: "preferences_access",
          subscriberId: subscriber._id,
          expiresAt: now + PREFERENCES_ACCESS_TTL_MS,
          sendId: send._id,
          campaignId: send.campaignId,
        });
        const unsubscribeUrl = `${siteBase}/uitschrijven?token=${encodeURIComponent(unsubscribeToken)}`;
        const listUnsubscribeUrl = `${siteBase}/api/email/uitschrijven?token=${encodeURIComponent(unsubscribeToken)}`;
        const preferencesUrl = `${siteBase}/email/voorkeuren?token=${encodeURIComponent(preferencesToken)}`;
        let html = replacePreferencesLinks(
          revision.html.replaceAll(`${siteBase}/uitschrijven`, unsubscribeUrl),
          siteBase,
          preferencesUrl,
        );
        let text = replacePreferencesLinks(
          revision.text.replaceAll(`${siteBase}/uitschrijven`, unsubscribeUrl),
          siteBase,
          preferencesUrl,
        );
        const articleSlugs = collectArticleSlugs(siteBase, [html, text]);
        if (articleSlugs.size > 0) {
          const articleToken = await mintEmailLinkToken(ctx, {
            purpose: "article_access",
            subscriberId: subscriber._id,
            expiresAt: now + ARTICLE_ACCESS_TTL_MS,
            sendId: send._id,
            campaignId: send.campaignId,
          });
          html = replaceArticleLinks(html, siteBase, articleToken);
          text = replaceArticleLinks(text, siteBase, articleToken);
        }
        const emailId = await resend.sendEmail(ctx, {
          from: `${sender.fromName} <${sender.fromAddress}>`,
          to: subscriber.normalizedEmail,
          replyTo: [sender.replyTo],
          subject: revision.subject,
          html,
          text,
          headers: [
            { name: "List-Unsubscribe", value: `<${listUnsubscribeUrl}>` },
            {
              name: "List-Unsubscribe-Post",
              value: "List-Unsubscribe=One-Click",
            },
          ],
        });
        await ctx.db.patch(recipient._id, {
          status: "queued",
          resendEmailId: emailId,
          queuedAt: Date.now(),
        });
        queuedDelta += 1;
      } catch (error) {
        await ctx.db.patch(recipient._id, {
          status: "failed",
          errorCode:
            error instanceof Error
              ? error.message.slice(0, 120)
              : "QUEUE_FAILED",
          failedAt: Date.now(),
        });
        failedDelta += 1;
      }
    }

    const fresh = await ctx.db.get(args.sendId);
    if (fresh) {
      await ctx.db.patch(args.sendId, {
        queuedCount: fresh.queuedCount + queuedDelta,
        failedCount: fresh.failedCount + failedDelta,
        suppressedCount: fresh.suppressedCount + suppressedDelta,
      });
    }

    if (queuedDelta > 0) {
      await markEmailMediaUsedByHtml(ctx, revision.html);
    }

    if (page.isDone) {
      await finalizeQueuedSend(ctx, send);
      return null;
    }

    await ctx.scheduler.runAfter(
      0,
      internal.newsletterSendPipeline.enqueueRecipientBatch,
      { sendId: args.sendId, cursor: page.continueCursor },
    );
    return null;
  },
});
