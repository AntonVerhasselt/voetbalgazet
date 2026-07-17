import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { editorMutation, viewerQuery } from "./lib/adminAuth";
import {
  COMPLIANCE,
  EDITOR_FORMAT,
  EDITOR_FORMAT_VERSION,
} from "./lib/compliance";
import { normalizeAndValidateEmail } from "./lib/email";
import { createUnsubscribeToken } from "./lib/emailLinkToken";
import { renderCampaignEmail } from "./lib/emailRender";
import { hasActiveSuppression } from "./lib/suppressions";
import { resend } from "./resendClient";

const PREPARE_BATCH = 100;

function siteBaseUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/u, "");
}

function analyticsId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function writeAudit(
  ctx: MutationCtx,
  args: {
    action: Doc<"newsletterAuditEvents">["action"];
    actorUserId?: Id<"users">;
    campaignId?: Id<"newsletterCampaigns">;
    sendId?: Id<"newsletterSends">;
    metadata?: string;
  },
) {
  await ctx.db.insert("newsletterAuditEvents", {
    action: args.action,
    actorUserId: args.actorUserId,
    campaignId: args.campaignId,
    sendId: args.sendId,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}

async function createRevision(
  ctx: MutationCtx,
  args: {
    campaign: Doc<"newsletterCampaigns">;
    userId: Id<"users">;
    reason: "manual" | "test" | "send";
  },
): Promise<Id<"newsletterRevisions">> {
  const rendered = renderCampaignEmail({
    documentJson: args.campaign.documentJson,
    subject: args.campaign.subject,
    preheader: args.campaign.preheader,
    links: {
      unsubscribeUrl: `${siteBaseUrl()}/uitschrijven`,
      preferencesUrl: `${siteBaseUrl()}${COMPLIANCE.preferencesPath}`,
      privacyUrl: `${siteBaseUrl()}${COMPLIANCE.privacyPath}`,
      siteUrl: siteBaseUrl(),
    },
  });
  const latest = await ctx.db
    .query("newsletterRevisions")
    .withIndex("by_campaign_and_version", (q) =>
      q.eq("campaignId", args.campaign._id),
    )
    .order("desc")
    .first();
  const version = (latest?.version ?? 0) + 1;
  const revisionId = await ctx.db.insert("newsletterRevisions", {
    campaignId: args.campaign._id,
    version,
    editorFormat: EDITOR_FORMAT,
    editorFormatVersion: EDITOR_FORMAT_VERSION,
    documentJson: args.campaign.documentJson,
    html: rendered.html,
    text: rendered.text,
    rendererVersion: rendered.rendererVersion,
    themeVersion: rendered.themeVersion,
    footerVersion: rendered.footerVersion,
    subject: args.campaign.subject,
    preheader: args.campaign.preheader,
    createdBy: args.userId,
    createdAt: Date.now(),
    reason: args.reason,
  });
  await ctx.db.patch(args.campaign._id, {
    activeRevisionId: revisionId,
    previewHtml: rendered.html,
    previewText: rendered.text,
    previewGeneratedAt: Date.now(),
  });
  return revisionId;
}

async function loadSendable(
  ctx: MutationCtx,
  campaignId: Id<"newsletterCampaigns">,
) {
  const campaign = await ctx.db.get(campaignId);
  if (!campaign) {
    throw new Error("Nieuwsbrief niet gevonden.");
  }
  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    throw new Error("Deze nieuwsbrief kan niet meer worden verzonden.");
  }
  if (!campaign.subject.trim()) {
    throw new Error("Vul een onderwerp in.");
  }
  if (!campaign.audienceDefinitionId) {
    throw new Error("Bevestig eerst het publiek.");
  }
  const audience = await ctx.db.get(campaign.audienceDefinitionId);
  if (!audience?.confirmedAt) {
    throw new Error("Bevestig het publiek vóór verzending.");
  }
  const sender = await ctx.db.get(campaign.senderProfileId);
  if (!sender?.domainVerified) {
    throw new Error("Afzenderdomein is niet geverifieerd.");
  }
  return { campaign, audience, sender };
}

function contentMatchesTest(
  campaign: Doc<"newsletterCampaigns">,
  test: Doc<"newsletterRevisions"> | null,
): boolean {
  return Boolean(
    test &&
      test.documentJson === campaign.documentJson &&
      test.subject === campaign.subject,
  );
}

export const requestTestSend = editorMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    toEmail: v.string(),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const toEmail = normalizeAndValidateEmail(args.toEmail);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Nieuwsbrief niet gevonden.");
    }
    if (campaign.status !== "draft") {
      throw new Error("Testmail alleen voor concepten.");
    }
    if (!campaign.subject.trim()) {
      throw new Error("Vul een onderwerp in vóór de testmail.");
    }

    const revisionId = await createRevision(ctx, {
      campaign,
      userId: ctx.adminUser._id,
      reason: "test",
    });
    const revision = await ctx.db.get(revisionId);
    const sender = await ctx.db.get(campaign.senderProfileId);
    if (!revision || !sender) {
      throw new Error("Revisie of afzender ontbreekt.");
    }

    const unsubscribeToken = await createUnsubscribeToken(toEmail);
    const unsubUrl = `${siteBaseUrl()}/uitschrijven?token=${encodeURIComponent(unsubscribeToken)}`;
    const html = revision.html.replaceAll(
      `${siteBaseUrl()}/uitschrijven`,
      unsubUrl,
    );
    const text = `${revision.text}\n\nUitschrijven: ${unsubUrl}`;

    try {
      await resend.sendEmail(ctx, {
        from: `${sender.fromName} <${sender.fromAddress}>`,
        to: toEmail,
        replyTo: [sender.replyTo],
        subject: `[TEST] ${revision.subject}`,
        html: `<div style="padding:8px 12px;background:#fff3cd;color:#664d03;font-family:sans-serif;font-size:13px;">Dit is een testmail — niet bestemd voor abonnees.</div>${html}`,
        text: `Dit is een testmail.\n\n${text}`,
      });
      await ctx.db.patch(args.campaignId, {
        lastSuccessfulTestRevisionId: revisionId,
        lastSuccessfulTestAt: Date.now(),
      });
      await writeAudit(ctx, {
        action: "test_completed",
        actorUserId: ctx.adminUser._id,
        campaignId: args.campaignId,
      });
      return { ok: true };
    } catch (error) {
      await writeAudit(ctx, {
        action: "test_failed",
        actorUserId: ctx.adminUser._id,
        campaignId: args.campaignId,
        metadata: error instanceof Error ? error.message : "unknown",
      });
      throw new Error(
        error instanceof Error
          ? `Testmail mislukt: ${error.message}`
          : "Testmail mislukt.",
      );
    }
  },
});

export const requestSendNow = editorMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    expectedRevisionNumber: v.number(),
    expectedPreviewCount: v.number(),
    clientRequestId: v.string(),
    confirm: v.literal(true),
  },
  returns: v.id("newsletterSends"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("newsletterSends")
      .withIndex("by_clientRequestId", (q) =>
        q.eq("clientRequestId", args.clientRequestId),
      )
      .unique();
    if (existing) {
      return existing._id;
    }

    const { campaign, audience, sender } = await loadSendable(
      ctx,
      args.campaignId,
    );
    if (campaign.revisionNumber !== args.expectedRevisionNumber) {
      throw new Error("Concept is gewijzigd. Herlaad en probeer opnieuw.");
    }
    const latestTest = campaign.lastSuccessfulTestRevisionId
      ? await ctx.db.get(campaign.lastSuccessfulTestRevisionId)
      : null;
    if (!contentMatchesTest(campaign, latestTest)) {
      throw new Error(
        "Verstuur eerst een geslaagde testmail van de huidige inhoud.",
      );
    }

    const revisionId = await createRevision(ctx, {
      campaign,
      userId: ctx.adminUser._id,
      reason: "send",
    });
    const now = Date.now();
    const sendId = await ctx.db.insert("newsletterSends", {
      campaignId: args.campaignId,
      revisionId,
      audienceDefinitionId: audience._id,
      status: "preparing",
      analyticsId: analyticsId(),
      requestedBy: ctx.adminUser._id,
      requestedAt: now,
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
      sendRevisionId: revisionId,
      sendRequestedAt: now,
      sendRequestedBy: ctx.adminUser._id,
      clientRequestId: args.clientRequestId,
      eligibleCountAtPreview: args.expectedPreviewCount,
    });

    await writeAudit(ctx, {
      action: "send_confirmed",
      actorUserId: ctx.adminUser._id,
      campaignId: args.campaignId,
      sendId,
      metadata: sender.fromAddress,
    });

    await ctx.scheduler.runAfter(0, internal.newsletterSend.prepareRecipients, {
      sendId,
      cursor: null,
    });

    return sendId;
  },
});

export const scheduleSend = editorMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    expectedRevisionNumber: v.number(),
    expectedPreviewCount: v.number(),
    scheduledFor: v.number(),
    clientRequestId: v.string(),
    confirm: v.literal(true),
    now: v.number(),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const { campaign, audience } = await loadSendable(ctx, args.campaignId);
    if (campaign.revisionNumber !== args.expectedRevisionNumber) {
      throw new Error("Concept is gewijzigd. Herlaad en probeer opnieuw.");
    }
    if (args.scheduledFor < args.now + 5 * 60 * 1000) {
      throw new Error("Plan minstens 5 minuten vooruit.");
    }
    const latestTest = campaign.lastSuccessfulTestRevisionId
      ? await ctx.db.get(campaign.lastSuccessfulTestRevisionId)
      : null;
    if (!contentMatchesTest(campaign, latestTest)) {
      throw new Error(
        "Verstuur eerst een geslaagde testmail van de huidige inhoud.",
      );
    }

    const revisionId = await createRevision(ctx, {
      campaign,
      userId: ctx.adminUser._id,
      reason: "send",
    });
    const generation = (campaign.scheduleGeneration ?? 0) + 1;
    const jobId = await ctx.scheduler.runAt(
      args.scheduledFor,
      internal.newsletterSend.executeScheduledSend,
      {
        campaignId: args.campaignId,
        scheduleGeneration: generation,
        clientRequestId: args.clientRequestId,
        expectedPreviewCount: args.expectedPreviewCount,
        revisionId,
        audienceDefinitionId: audience._id,
        requestedBy: ctx.adminUser._id,
      },
    );

    await ctx.db.patch(args.campaignId, {
      status: "scheduled",
      scheduledFor: args.scheduledFor,
      scheduleGeneration: generation,
      scheduledJobId: jobId,
      sendRevisionId: revisionId,
      eligibleCountAtPreview: args.expectedPreviewCount,
      clientRequestId: args.clientRequestId,
    });

    await writeAudit(ctx, {
      action: "scheduled",
      actorUserId: ctx.adminUser._id,
      campaignId: args.campaignId,
      metadata: String(args.scheduledFor),
    });

    return { ok: true };
  },
});

export const cancelSchedule = editorMutation({
  args: { campaignId: v.id("newsletterCampaigns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Nieuwsbrief niet gevonden.");
    }
    if (campaign.status !== "scheduled") {
      throw new Error(
        "Alleen geplande nieuwsbrieven kunnen worden geannuleerd.",
      );
    }
    await ctx.db.patch(args.campaignId, {
      status: "cancelled",
      scheduleGeneration: (campaign.scheduleGeneration ?? 0) + 1,
      scheduledJobId: undefined,
    });
    await writeAudit(ctx, {
      action: "schedule_cancelled",
      actorUserId: ctx.adminUser._id,
      campaignId: args.campaignId,
    });
    return null;
  },
});

export const executeScheduledSend = internalMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    scheduleGeneration: v.number(),
    clientRequestId: v.string(),
    expectedPreviewCount: v.number(),
    revisionId: v.id("newsletterRevisions"),
    audienceDefinitionId: v.id("newsletterAudienceDefinitions"),
    requestedBy: v.id("users"),
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
      analyticsId: analyticsId(),
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
    await ctx.scheduler.runAfter(0, internal.newsletterSend.prepareRecipients, {
      sendId,
      cursor: null,
    });
    return null;
  },
});

export const listEligibleSubscriberPage = internalQuery({
  args: {
    audienceDefinitionId: v.id("newsletterAudienceDefinitions"),
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
    const page = await ctx.db
      .query("subscribers")
      .withIndex("by_newsletter_subscribed", (q) =>
        q.eq("newsletterSubscribed", true),
      )
      .paginate({
        numItems: args.paginationOpts.numItems,
        cursor: args.paginationOpts.cursor,
      });

    const subscriberIds: Id<"subscribers">[] = [];
    for (const subscriber of page.page) {
      if (subscriber.unsubscribedAt !== undefined) {
        continue;
      }
      if (
        await hasActiveSuppression(ctx, {
          subscriberId: subscriber._id,
          normalizedEmail: subscriber.normalizedEmail,
        })
      ) {
        continue;
      }
      if (definition.divisionIds.length > 0) {
        const matches = subscriber.divisionIds.some((id) =>
          definition.divisionIds.includes(id),
        );
        if (!matches) {
          continue;
        }
      }
      if (definition.favoriteTeamIds.length > 0) {
        if (
          !subscriber.favoriteTeamId ||
          !definition.favoriteTeamIds.includes(subscriber.favoriteTeamId)
        ) {
          continue;
        }
      }
      subscriberIds.push(subscriber._id);
    }
    return {
      subscriberIds,
      continueCursor: page.isDone ? null : page.continueCursor,
      isDone: page.isDone,
    };
  },
});

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
    const page = await ctx.runQuery(
      internal.newsletterSend.listEligibleSubscriberPage,
      {
        audienceDefinitionId: send.audienceDefinitionId,
        paginationOpts: {
          numItems: PREPARE_BATCH,
          cursor: args.cursor,
        },
      },
    );

    const now = Date.now();
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
        internal.newsletterSend.prepareRecipients,
        {
          sendId: args.sendId,
          cursor: page.continueCursor,
        },
      );
      return null;
    }

    const prepared = await ctx.db
      .query("newsletterRecipients")
      .withIndex("by_send_and_status", (q) =>
        q.eq("sendId", args.sendId).eq("status", "prepared"),
      )
      .collect();

    if (prepared.length === 0) {
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
      return null;
    }

    await ctx.db.patch(args.sendId, {
      status: "sending",
      expectedRecipientCount: prepared.length,
    });
    await ctx.db.patch(send.campaignId, {
      status: "sending",
      recipientCount: prepared.length,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.newsletterSend.enqueueRecipientBatch,
      { sendId: args.sendId },
    );
    return null;
  },
});

export const enqueueRecipientBatch = internalMutation({
  args: { sendId: v.id("newsletterSends") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const send = await ctx.db.get(args.sendId);
    if (!send || send.status !== "sending") {
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

    const batch = await ctx.db
      .query("newsletterRecipients")
      .withIndex("by_send_and_status", (q) =>
        q.eq("sendId", args.sendId).eq("status", "prepared"),
      )
      .take(50);

    if (batch.length === 0) {
      const failedSample = await ctx.db
        .query("newsletterRecipients")
        .withIndex("by_send_and_status", (q) =>
          q.eq("sendId", args.sendId).eq("status", "failed"),
        )
        .take(1);
      const current = await ctx.db.get(args.sendId);
      if (!current) {
        return null;
      }
      const finalStatus =
        failedSample.length > 0 && current.queuedCount === 0
          ? "failed"
          : failedSample.length > 0
            ? "partially_failed"
            : "sent";
      const now = Date.now();
      await ctx.db.patch(args.sendId, {
        status: finalStatus,
        completedAt: now,
      });
      await ctx.db.patch(send.campaignId, {
        status: finalStatus,
        sentAt: now,
      });
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
        const token = await createUnsubscribeToken(subscriber.normalizedEmail);
        const unsubUrl = `${siteBaseUrl()}/uitschrijven?token=${encodeURIComponent(token)}`;
        const html = revision.html.replaceAll(
          `${siteBaseUrl()}/uitschrijven`,
          unsubUrl,
        );
        const text = revision.text.replaceAll(
          `${siteBaseUrl()}/uitschrijven`,
          unsubUrl,
        );
        const emailId = await resend.sendEmail(ctx, {
          from: `${sender.fromName} <${sender.fromAddress}>`,
          to: subscriber.normalizedEmail,
          replyTo: [sender.replyTo],
          subject: revision.subject,
          html,
          text,
          headers: [
            { name: "List-Unsubscribe", value: `<${unsubUrl}>` },
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

    await ctx.scheduler.runAfter(
      0,
      internal.newsletterSend.enqueueRecipientBatch,
      { sendId: args.sendId },
    );
    return null;
  },
});

export const getSendResults = viewerQuery({
  args: { campaignId: v.id("newsletterCampaigns") },
  returns: v.union(
    v.object({
      send: v.object({
        _id: v.id("newsletterSends"),
        status: v.string(),
        analyticsId: v.string(),
        requestedAt: v.number(),
        scheduledFor: v.optional(v.number()),
        expectedRecipientCount: v.optional(v.number()),
        queuedCount: v.number(),
        deliveredCount: v.number(),
        bouncedCount: v.number(),
        complainedCount: v.number(),
        failedCount: v.number(),
        suppressedCount: v.number(),
        openedCount: v.number(),
        clickedCount: v.number(),
        completedAt: v.optional(v.number()),
        lastErrorCode: v.optional(v.string()),
      }),
      campaignStatus: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const send = await ctx.db
      .query("newsletterSends")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .first();
    if (!send) {
      return null;
    }
    const campaign = await ctx.db.get(args.campaignId);
    return {
      send: {
        _id: send._id,
        status: send.status,
        analyticsId: send.analyticsId,
        requestedAt: send.requestedAt,
        scheduledFor: send.scheduledFor,
        expectedRecipientCount: send.expectedRecipientCount,
        queuedCount: send.queuedCount,
        deliveredCount: send.deliveredCount,
        bouncedCount: send.bouncedCount,
        complainedCount: send.complainedCount,
        failedCount: send.failedCount,
        suppressedCount: send.suppressedCount,
        openedCount: send.openedCount,
        clickedCount: send.clickedCount,
        completedAt: send.completedAt,
        lastErrorCode: send.lastErrorCode,
      },
      campaignStatus: campaign?.status ?? "unknown",
    };
  },
});
