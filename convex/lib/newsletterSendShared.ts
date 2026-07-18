import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  COMPLIANCE,
  EDITOR_FORMAT,
  EDITOR_FORMAT_VERSION,
} from "./compliance";
import { extractEmailMediaR2Keys } from "./emailMedia";
import { renderCampaignEmail } from "./emailRender";

export function siteBaseUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/u, "");
}

export function analyticsId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function markEmailMediaUsedByHtml(
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

export async function writeAudit(
  ctx: MutationCtx,
  args: {
    action: Doc<"newsletterAuditEvents">["action"];
    actorUserId?: Id<"users">;
    campaignId?: Id<"newsletterCampaigns">;
    sendId?: Id<"newsletterSends">;
    metadata?: string;
  },
): Promise<void> {
  await ctx.db.insert("newsletterAuditEvents", {
    action: args.action,
    actorUserId: args.actorUserId,
    campaignId: args.campaignId,
    sendId: args.sendId,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}

export async function createRevision(
  ctx: MutationCtx,
  args: {
    campaign: Doc<"newsletterCampaigns">;
    userId: Id<"users">;
    reason: "manual" | "test" | "send";
    campaignAnalyticsId?: string;
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
    campaignAnalyticsId: args.campaignAnalyticsId,
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

export async function loadSendable(
  ctx: MutationCtx,
  campaignId: Id<"newsletterCampaigns">,
): Promise<{
  campaign: Doc<"newsletterCampaigns">;
  audience: Doc<"newsletterAudienceDefinitions">;
  sender: Doc<"emailSenderProfiles">;
}> {
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

export function contentMatchesTest(
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
