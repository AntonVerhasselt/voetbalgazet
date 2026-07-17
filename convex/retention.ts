import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const DAY_MS = 1000 * 60 * 60 * 24;
const EMAIL_LINK_BATCH = 100;
const DELIVERY_EVENT_BATCH = 100;
const CANCELLED_BATCH = 50;

/**
 * Retention windows from newsletter ops plan:
 * - expired email link tokens
 * - delivery events older than 90 days
 * - cancelled campaigns older than 90 days
 */
export const cleanupExpiredData = internalMutation({
  args: {},
  returns: v.object({
    expiredTokensDeleted: v.number(),
    deliveryEventsDeleted: v.number(),
    cancelledCampaignsDeleted: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    let expiredTokensDeleted = 0;
    let deliveryEventsDeleted = 0;
    let cancelledCampaignsDeleted = 0;

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

    return {
      expiredTokensDeleted,
      deliveryEventsDeleted,
      cancelledCampaignsDeleted,
    };
  },
});
