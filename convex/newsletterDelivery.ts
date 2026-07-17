import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { isHardBounceEvent } from "./lib/bounce";
import {
  shouldAlertBounceSpike,
  shouldAlertComplaintSpike,
} from "./lib/deliveryAlerts";
import { addSuppression } from "./lib/suppressions";

const RECIPIENT_RANK: Record<string, number> = {
  prepared: 0,
  queued: 1,
  sent: 2,
  delivered: 3,
  opened: 3,
  clicked: 3,
  bounced: 4,
  complained: 5,
  failed: 4,
  suppressed: 4,
};

function mapEventToStatus(
  eventType: string,
):
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "queued"
  | null {
  switch (eventType) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.failed":
      return "failed";
    case "email.delivery_delayed":
      return "queued";
    default:
      return null;
  }
}

export const applyProviderEvent = internalMutation({
  args: {
    resendEmailId: v.string(),
    eventType: v.string(),
    createdAt: v.string(),
    bounceType: v.optional(v.string()),
    bounceSubType: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const recipient = await ctx.db
      .query("newsletterRecipients")
      .withIndex("by_resendEmailId", (q) =>
        q.eq("resendEmailId", args.resendEmailId),
      )
      .unique();
    if (!recipient) {
      return null;
    }

    const providerEventId = `${args.resendEmailId}:${args.eventType}:${args.createdAt}`;
    const existingEvent = await ctx.db
      .query("newsletterDeliveryEvents")
      .withIndex("by_providerEventId", (q) =>
        q.eq("providerEventId", providerEventId),
      )
      .unique();
    if (existingEvent) {
      return null;
    }

    const providerTimestamp = Date.parse(args.createdAt) || Date.now();
    await ctx.db.insert("newsletterDeliveryEvents", {
      recipientId: recipient._id,
      sendId: recipient.sendId,
      providerEventId,
      eventType: args.eventType,
      providerTimestamp,
      receivedAt: Date.now(),
      reasonCode: args.bounceSubType ?? args.bounceType,
      schemaVersion: 1,
    });

    const nextStatus = mapEventToStatus(args.eventType);
    if (nextStatus) {
      const currentRank = RECIPIENT_RANK[recipient.status] ?? 0;
      const nextRank = RECIPIENT_RANK[nextStatus] ?? 0;
      if (nextRank >= currentRank) {
        await ctx.db.patch(recipient._id, {
          status: nextStatus,
          lastEventAt: providerTimestamp,
          deliveredAt:
            nextStatus === "delivered" ? providerTimestamp : recipient.deliveredAt,
          failedAt:
            nextStatus === "failed" || nextStatus === "bounced"
              ? providerTimestamp
              : recipient.failedAt,
        });
      }
    }

    const send = await ctx.db.get(recipient.sendId);
    if (send) {
      const patch: {
        deliveredCount?: number;
        bouncedCount?: number;
        complainedCount?: number;
        failedCount?: number;
        openedCount?: number;
        clickedCount?: number;
        bounceSpikeAlertedAt?: number;
        complaintSpikeAlertedAt?: number;
      } = {};
      if (args.eventType === "email.delivered") {
        patch.deliveredCount = send.deliveredCount + 1;
      } else if (args.eventType === "email.bounced") {
        patch.bouncedCount = send.bouncedCount + 1;
      } else if (args.eventType === "email.complained") {
        patch.complainedCount = send.complainedCount + 1;
      } else if (args.eventType === "email.failed") {
        patch.failedCount = send.failedCount + 1;
      } else if (args.eventType === "email.opened") {
        patch.openedCount = send.openedCount + 1;
      } else if (args.eventType === "email.clicked") {
        patch.clickedCount = send.clickedCount + 1;
      }

      const nextBounced = patch.bouncedCount ?? send.bouncedCount;
      const nextComplained = patch.complainedCount ?? send.complainedCount;
      const now = Date.now();

      if (
        shouldAlertBounceSpike({
          queuedCount: send.queuedCount,
          bouncedCount: nextBounced,
          alreadyAlerted: send.bounceSpikeAlertedAt !== undefined,
        })
      ) {
        patch.bounceSpikeAlertedAt = now;
        await ctx.scheduler.runAfter(
          0,
          internal.newsletterAdmin.dispatchAdminSendAlert,
          {
            campaignId: send.campaignId,
            sendId: send._id,
            status: "bounce_spike",
          },
        );
      }
      if (
        shouldAlertComplaintSpike({
          queuedCount: send.queuedCount,
          complainedCount: nextComplained,
          alreadyAlerted: send.complaintSpikeAlertedAt !== undefined,
        })
      ) {
        patch.complaintSpikeAlertedAt = now;
        await ctx.scheduler.runAfter(
          0,
          internal.newsletterAdmin.dispatchAdminSendAlert,
          {
            campaignId: send.campaignId,
            sendId: send._id,
            status: "complaint_spike",
          },
        );
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(send._id, patch);
      }
    }

    const isHardBounce = isHardBounceEvent(
      args.eventType,
      args.bounceType,
      args.bounceSubType,
    );
    if (isHardBounce || args.eventType === "email.complained") {
      const subscriber = await ctx.db.get(recipient.subscriberId);
      if (subscriber) {
        await addSuppression(ctx, {
          subscriberId: subscriber._id,
          normalizedEmail: subscriber.normalizedEmail,
          type: isHardBounce ? "hard_bounce" : "complaint",
          sourceId: args.resendEmailId,
        });
        if (isHardBounce) {
          await ctx.db.patch(subscriber._id, {
            emailDeliveryStatus: "bounced",
          });
        }
      }
    }

    return null;
  },
});
