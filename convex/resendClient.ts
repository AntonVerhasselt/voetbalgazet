import { Resend, vOnEmailEventArgs } from "@convex-dev/resend";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

/**
 * Keep testMode true outside production so only Resend test addresses
 * (e.g. delivered@resend.dev) can receive mail from this deployment.
 * Set NEWSLETTER_LIVE_SEND=true on a production deployment to disable testMode.
 */
const liveSendEnabled = process.env.NEWSLETTER_LIVE_SEND === "true";

export const resend: Resend = new Resend(components.resend, {
  testMode: !liveSendEnabled,
  onEmailEvent: internal.resendClient.handleEmailEvent,
});

export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.newsletterDelivery.applyProviderEvent, {
      resendEmailId: args.id,
      eventType: args.event.type,
      createdAt: args.event.created_at,
    });
    return null;
  },
});
