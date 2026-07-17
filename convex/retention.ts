import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const DAY_MS = 1000 * 60 * 60 * 24;
const EMAIL_LINK_BATCH = 100;
const DELIVERY_EVENT_BATCH = 100;
const CANCELLED_BATCH = 50;
const AUDIT_BATCH = 100;
const REVISION_CAMPAIGN_BATCH = 40;
const REVISION_BATCH = 30;
const MEDIA_BATCH = 50;

/**
 * Retention windows from newsletter ops plan:
 * - expired email link tokens
 * - delivery events older than 90 days
 * - cancelled campaigns older than 90 days
 * - unused campaign revisions older than 90 days (paginated across all campaigns)
 * - audit events older than 24 months
 * - unused draft email media older than 90 days
 */
export const cleanupExpiredData = internalMutation({
  args: {
    revisionCursor: v.optional(v.union(v.string(), v.null())),
    revisionOnly: v.optional(v.boolean()),
  },
  returns: v.object({
    expiredTokensDeleted: v.number(),
    deliveryEventsDeleted: v.number(),
    cancelledCampaignsDeleted: v.number(),
    unusedRevisionsDeleted: v.number(),
    auditEventsDeleted: v.number(),
    draftMediaDeleted: v.number(),
    revisionContinuationScheduled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    let expiredTokensDeleted = 0;
    let deliveryEventsDeleted = 0;
    let cancelledCampaignsDeleted = 0;
    let unusedRevisionsDeleted = 0;
    let auditEventsDeleted = 0;
    let draftMediaDeleted = 0;
    let revisionContinuationScheduled = false;

    if (!args.revisionOnly) {
      const expiredTokens = await ctx.db
        .query("emailLinkTokens")
        .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
        .take(EMAIL_LINK_BATCH);
      for (const token of expiredTokens) {
        await ctx.db.delete(token._id);
        expiredTokensDeleted += 1;
      }

      const deliveryCutoff = now - 90 * DAY_MS;
      const oldEvents = await ctx.db
        .query("newsletterDeliveryEvents")
        .withIndex("by_receivedAt", (q) => q.lt("receivedAt", deliveryCutoff))
        .take(DELIVERY_EVENT_BATCH);
      for (const event of oldEvents) {
        await ctx.db.delete(event._id);
        deliveryEventsDeleted += 1;
      }

      const cancelCutoff = now - 90 * DAY_MS;
      const cancelled = await ctx.db
        .query("newsletterCampaigns")
        .withIndex("by_status_and_updatedAt", (q) =>
          q.eq("status", "cancelled").lt("updatedAt", cancelCutoff),
        )
        .take(CANCELLED_BATCH);
      for (const campaign of cancelled) {
        await ctx.db.delete(campaign._id);
        cancelledCampaignsDeleted += 1;
      }

      const auditCutoff = now - 24 * 30 * DAY_MS;
      const oldAudits = await ctx.db
        .query("newsletterAuditEvents")
        .withIndex("by_createdAt", (q) => q.lt("createdAt", auditCutoff))
        .take(AUDIT_BATCH);
      for (const event of oldAudits) {
        await ctx.db.delete(event._id);
        auditEventsDeleted += 1;
      }

      const mediaCutoff = now - 90 * DAY_MS;
      const staleUploading = await ctx.db
        .query("emailMedia")
        .withIndex("by_status_and_createdAt", (q) =>
          q.eq("status", "uploading").lt("createdAt", mediaCutoff),
        )
        .take(MEDIA_BATCH);
      for (const media of staleUploading) {
        await ctx.db.delete(media._id);
        draftMediaDeleted += 1;
      }
      if (draftMediaDeleted < MEDIA_BATCH) {
        const rejected = await ctx.db
          .query("emailMedia")
          .withIndex("by_status_and_createdAt", (q) =>
            q.eq("status", "rejected").lt("createdAt", mediaCutoff),
          )
          .take(MEDIA_BATCH - draftMediaDeleted);
        for (const media of rejected) {
          await ctx.db.delete(media._id);
          draftMediaDeleted += 1;
        }
      }
    }

    const revisionCutoff = now - 90 * DAY_MS;
    const campaignsPage = await ctx.db.query("newsletterCampaigns").paginate({
      numItems: REVISION_CAMPAIGN_BATCH,
      cursor: args.revisionCursor ?? null,
    });
    for (const campaign of campaignsPage.page) {
      const protectedIds = new Set(
        [
          campaign.activeRevisionId,
          campaign.sendRevisionId,
          campaign.lastSuccessfulTestRevisionId,
        ].filter((id): id is NonNullable<typeof id> => id !== undefined),
      );
      const oldRevisions = await ctx.db
        .query("newsletterRevisions")
        .withIndex("by_campaign_and_createdAt", (q) =>
          q.eq("campaignId", campaign._id).lt("createdAt", revisionCutoff),
        )
        .take(REVISION_BATCH);
      for (const revision of oldRevisions) {
        if (protectedIds.has(revision._id)) {
          continue;
        }
        await ctx.db.delete(revision._id);
        unusedRevisionsDeleted += 1;
      }
    }

    if (!campaignsPage.isDone) {
      await ctx.scheduler.runAfter(0, internal.retention.cleanupExpiredData, {
        revisionCursor: campaignsPage.continueCursor,
        revisionOnly: true,
      });
      revisionContinuationScheduled = true;
    }

    return {
      expiredTokensDeleted,
      deliveryEventsDeleted,
      cancelledCampaignsDeleted,
      unusedRevisionsDeleted,
      auditEventsDeleted,
      draftMediaDeleted,
      revisionContinuationScheduled,
    };
  },
});
