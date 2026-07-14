import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAudienceSubscribers, type AudienceFilter } from "./lib/audience";

const audienceFilterArgs = v.object({
  newsletterSubscribedOnly: v.boolean(),
  divisionIds: v.optional(v.array(v.id("divisions"))),
  favoriteTeamIds: v.optional(v.array(v.id("teams"))),
  matchMode: v.optional(v.union(v.literal("any"), v.literal("all"))),
});

export const sendTest = mutation({
  args: {
    emailId: v.id("newsletterEmails"),
    testAddress: v.string(),
    renderedHtml: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = await ctx.db.get("newsletterEmails", args.emailId);
    if (!email) {
      throw new Error("Email not found");
    }

    await ctx.scheduler.runAfter(0, internal.emailSendingActions.sendSingleEmail, {
      to: args.testAddress,
      subject: `[TEST] ${email.subject}`,
      html: args.renderedHtml,
      emailId: args.emailId,
      subscriberId: undefined,
    });

    return null;
  },
});

export const sendToAudience = mutation({
  args: {
    emailId: v.id("newsletterEmails"),
    renderedHtml: v.string(),
    audienceFilter: audienceFilterArgs,
  },
  returns: v.object({
    recipientCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const email = await ctx.db.get("newsletterEmails", args.emailId);
    if (!email) {
      throw new Error("Email not found");
    }

    if (email.status === "sending") {
      throw new Error("Email is already being sent");
    }

    if (email.status === "sent") {
      throw new Error("Email has already been sent");
    }

    const subscribers = await getAudienceSubscribers(
      ctx,
      args.audienceFilter as AudienceFilter,
    );

    if (subscribers.length === 0) {
      throw new Error("No subscribers match the selected audience filters");
    }

    await ctx.db.patch("newsletterEmails", args.emailId, {
      status: "sending",
      audienceFilter: args.audienceFilter,
      renderedHtml: args.renderedHtml,
      recipientCount: subscribers.length,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.emailSendingActions.sendBatch, {
      emailId: args.emailId,
      subject: email.subject,
      html: args.renderedHtml,
      subscriberIds: subscribers.map((s) => s._id),
    });

    return { recipientCount: subscribers.length };
  },
});

export const markSendComplete = internalMutation({
  args: {
    emailId: v.id("newsletterEmails"),
    deliveredCount: v.number(),
    failedCount: v.number(),
    sendError: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const status = args.failedCount > 0 && args.deliveredCount === 0 ? "failed" : "sent";

    await ctx.db.patch("newsletterEmails", args.emailId, {
      status,
      sentAt: Date.now(),
      deliveredCount: args.deliveredCount,
      failedCount: args.failedCount,
      sendError: args.sendError,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const logSend = internalMutation({
  args: {
    emailId: v.id("newsletterEmails"),
    subscriberId: v.id("subscribers"),
    resendEmailId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("failed"),
    ),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("emailSendLogs", {
      emailId: args.emailId,
      subscriberId: args.subscriberId,
      resendEmailId: args.resendEmailId,
      status: args.status,
      errorMessage: args.errorMessage,
      sentAt: Date.now(),
    });
    return null;
  },
});
