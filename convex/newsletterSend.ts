import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { editorMutation, viewerQuery } from "./lib/adminAuth";
import {
  COMPLIANCE,
  EDITOR_FORMAT,
  EDITOR_FORMAT_VERSION,
} from "./lib/compliance";
import { normalizeAndValidateEmail } from "./lib/email";
import {
  ARTICLE_ACCESS_TTL_MS,
  PREFERENCES_ACCESS_TTL_MS,
  UNSUBSCRIBE_TTL_MS,
} from "./lib/emailLinkToken";
import { mintEmailLinkToken } from "./lib/emailLinkTokensDb";
import { extractEmailMediaR2Keys } from "./lib/emailMedia";
import { renderCampaignEmail } from "./lib/emailRender";
import { assertMarketingSendEnabled } from "./lib/runtimeSettings";
import { hasActiveSuppression } from "./lib/suppressions";
import { resend } from "./resendClient";

const PREPARE_BATCH = 100;
const ARTICLE_SLUG_PATTERN = "[a-z0-9]+(?:-[a-z0-9]+)*";
const ENQUEUE_BATCH = 50;
const COUNT_BATCH = 1000;

function siteBaseUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/u, "");
}

function analyticsId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function articleUrlPattern(siteBase: string): RegExp {
  return new RegExp(
    `${escapeRegExp(siteBase)}/nieuws/(${ARTICLE_SLUG_PATTERN})(?:[?#][^"'\\s<)]*)?`,
    "gu",
  );
}

function collectArticleSlugs(siteBase: string, contents: readonly string[]): Set<string> {
  const slugs = new Set<string>();
  for (const content of contents) {
    for (const match of content.matchAll(articleUrlPattern(siteBase))) {
      const slug = match[1];
      if (slug) {
        slugs.add(slug);
      }
    }
  }
  return slugs;
}

function replaceArticleLinks(
  content: string,
  siteBase: string,
  articleToken: string,
): string {
  return content.replace(
    articleUrlPattern(siteBase),
    (_match, slug: string) =>
      `${siteBase}/email/artikel?token=${encodeURIComponent(articleToken)}&slug=${encodeURIComponent(slug)}`,
  );
}

function replacePreferencesLinks(
  content: string,
  siteBase: string,
  preferencesUrl: string,
): string {
  return content
    .replaceAll(`${siteBase}/email/voorkeuren`, preferencesUrl)
    .replaceAll(`${siteBase}${COMPLIANCE.preferencesPath}`, preferencesUrl);
}

type EligibilityCursor =
  | {
      mode: "subscribed";
      cursor: string | null;
    }
  | {
      mode: "division";
      index: number;
      cursor: string | null;
    }
  | {
      mode: "team";
      index: number;
      cursor: string | null;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeEligibilityCursor(value: string | null): EligibilityCursor | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed) || typeof parsed.mode !== "string") {
      return { mode: "subscribed", cursor: value };
    }
    const cursor =
      typeof parsed.cursor === "string" || parsed.cursor === null
        ? parsed.cursor
        : null;
    if (parsed.mode === "subscribed") {
      return { mode: "subscribed", cursor };
    }
    if (
      (parsed.mode === "division" || parsed.mode === "team") &&
      typeof parsed.index === "number" &&
      Number.isInteger(parsed.index) &&
      parsed.index >= 0
    ) {
      return { mode: parsed.mode, index: parsed.index, cursor };
    }
  } catch {
    return { mode: "subscribed", cursor: value };
  }
  return { mode: "subscribed", cursor: value };
}

function encodeEligibilityCursor(cursor: EligibilityCursor): string {
  return JSON.stringify(cursor);
}

async function subscriberCanReceiveNewsletter(
  ctx: QueryCtx,
  subscriber: Doc<"subscribers">,
): Promise<boolean> {
  if (!subscriber.newsletterSubscribed || subscriber.unsubscribedAt !== undefined) {
    return false;
  }
  if (
    await hasActiveSuppression(ctx, {
      subscriberId: subscriber._id,
      normalizedEmail: subscriber.normalizedEmail,
    })
  ) {
    return false;
  }
  return true;
}

function subscriberMatchesAudienceFilters(
  subscriber: Doc<"subscribers">,
  definition: Doc<"newsletterAudienceDefinitions">,
  options: { divisionAlreadyMatched?: boolean } = {},
): boolean {
  if (!options.divisionAlreadyMatched && definition.divisionIds.length > 0) {
    const matches = subscriber.divisionIds.some((id) =>
      definition.divisionIds.includes(id),
    );
    if (!matches) {
      return false;
    }
  }
  if (definition.favoriteTeamIds.length > 0) {
    if (
      !subscriber.favoriteTeamId ||
      !definition.favoriteTeamIds.includes(subscriber.favoriteTeamId)
    ) {
      return false;
    }
  }
  return true;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function markEmailMediaUsedByHtml(
  ctx: MutationCtx,
  html: string,
): Promise<void> {
  for (const r2Key of extractEmailMediaR2Keys(html)) {
    const media = await ctx.db
      .query("emailMedia")
      .withIndex("by_r2Key", (q) => q.eq("r2Key", r2Key))
      .unique();
    if (media && !media.usedBySentEmail) {
      await ctx.db.patch(media._id, { usedBySentEmail: true });
    }
  }
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
      preferencesUrl: `${siteBaseUrl()}/email/voorkeuren`,
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
      test.subject === campaign.subject &&
      (test.preheader ?? "") === (campaign.preheader ?? ""),
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

    const unsubUrl = `${siteBaseUrl()}/uitschrijven`;
    const html = revision.html;
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

    await assertMarketingSendEnabled(ctx);

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
      scheduledFor: undefined,
      scheduleGeneration:
        campaign.status === "scheduled"
          ? (campaign.scheduleGeneration ?? 0) + 1
          : campaign.scheduleGeneration,
      scheduledJobId: undefined,
    });

    if (campaign.status === "scheduled") {
      await writeAudit(ctx, {
        action: "schedule_overridden_send_now",
        actorUserId: ctx.adminUser._id,
        campaignId: args.campaignId,
        sendId,
      });
    }

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
    await assertMarketingSendEnabled(ctx);

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
      scheduledFor: undefined,
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
    const decodedCursor = decodeEligibilityCursor(args.paginationOpts.cursor);
    const subscriberIds: Id<"subscribers">[] = [];

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
            subscriberMatchesAudienceFilters(subscriber, definition, {
              divisionAlreadyMatched: true,
            })
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
            subscriberMatchesAudienceFilters(subscriber, definition)
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
        subscriberMatchesAudienceFilters(subscriber, definition)
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
      internal.newsletterSend.countPreparedRecipientsPage,
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
      internal.newsletterSend.enqueueRecipientBatch,
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
    } catch (error) {
      const now = Date.now();
      await ctx.db.patch(args.sendId, {
        status: "failed",
        lastErrorCode: "MARKETING_KILL_SWITCH",
        completedAt: now,
      });
      await ctx.db.patch(send.campaignId, {
        status: "failed",
      });
      throw error;
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
          internal.newsletterSend.enqueueRecipientBatch,
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
      internal.newsletterSend.enqueueRecipientBatch,
      { sendId: args.sendId, cursor: page.continueCursor },
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
