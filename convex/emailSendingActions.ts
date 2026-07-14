"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { FROM_ADDRESS, resend } from "./lib/resendClient";

function wrapEmailHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;background:#fffef9;padding:32px 24px;">
  <div style="border-bottom:1px solid #1a1a1a;padding-bottom:16px;margin-bottom:24px;">
    <p style="margin:0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#666;font-family:monospace;">De Voetbalgazet</p>
    <p style="margin:4px 0 0;font-size:13px;color:#888;font-style:italic;">Lokaal voetbal, echte verhalen</p>
  </div>
  ${bodyHtml}
  <div style="border-top:1px solid #ddd;margin-top:32px;padding-top:16px;">
    <p style="margin:0;font-size:12px;color:#888;line-height:1.6;">
      Je ontvangt deze e-mail omdat je je hebt ingeschreven op De Voetbalgazet.
    </p>
  </div>
</div>
</body>
</html>`;
}

export const sendSingleEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    emailId: v.optional(v.id("newsletterEmails")),
    subscriberId: v.optional(v.id("subscribers")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const wrappedHtml = wrapEmailHtml(args.html);

    try {
      const resendEmailId = await resend.sendEmail(ctx, {
        from: FROM_ADDRESS,
        to: args.to,
        subject: args.subject,
        html: wrappedHtml,
      });

      if (args.emailId && args.subscriberId) {
        await ctx.runMutation(internal.emailSending.logSend, {
          emailId: args.emailId,
          subscriberId: args.subscriberId,
          resendEmailId,
          status: "queued",
        });
      }
    } catch (error) {
      if (args.emailId && args.subscriberId) {
        await ctx.runMutation(internal.emailSending.logSend, {
          emailId: args.emailId,
          subscriberId: args.subscriberId,
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown send error",
        });
      }
      throw error;
    }

    return null;
  },
});

export const sendBatch = internalAction({
  args: {
    emailId: v.id("newsletterEmails"),
    subject: v.string(),
    html: v.string(),
    subscriberIds: v.array(v.id("subscribers")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let deliveredCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const subscriberId of args.subscriberIds) {
      const subscriber = await ctx.runQuery(internal.subscribers.getById, {
        subscriberId,
      });

      if (!subscriber) {
        failedCount++;
        continue;
      }

      try {
        await ctx.runAction(internal.emailSendingActions.sendSingleEmail, {
          to: subscriber.normalizedEmail,
          subject: args.subject,
          html: args.html,
          emailId: args.emailId,
          subscriberId,
        });
        deliveredCount++;
      } catch (error) {
        failedCount++;
        errors.push(
          `${subscriber.normalizedEmail}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    await ctx.runMutation(internal.emailSending.markSendComplete, {
      emailId: args.emailId,
      deliveredCount,
      failedCount,
      sendError: errors.length > 0 ? errors.slice(0, 5).join("; ") : undefined,
    });

    return null;
  },
});
