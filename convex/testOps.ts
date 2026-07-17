import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { normalizeAndValidateEmail } from "./lib/email";
import {
  ARTICLE_ACCESS_TTL_MS,
  PREFERENCES_ACCESS_TTL_MS,
  UNSUBSCRIBE_TTL_MS,
} from "./lib/emailLinkToken";
import { mintEmailLinkToken } from "./lib/emailLinkTokensDb";

/**
 * Test/ops helper: remove a subscriber and related rows by email.
 * Used for controlled E2E resets — not exposed publicly.
 */
export const previewDeleteSubscriberByEmail = internalMutation({
  args: { email: v.string() },
  returns: v.object({
    found: v.boolean(),
    subscriberId: v.optional(v.id("subscribers")),
    normalizedEmail: v.optional(v.string()),
    related: v.object({
      consentEvents: v.number(),
      divisionPrefs: v.number(),
      emailLinkTokens: v.number(),
      suppressions: v.number(),
      recipients: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeAndValidateEmail(args.email);
    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_normalized_email", (q) =>
        q.eq("normalizedEmail", normalizedEmail),
      )
      .unique();
    if (!subscriber) {
      return {
        found: false,
        related: {
          consentEvents: 0,
          divisionPrefs: 0,
          emailLinkTokens: 0,
          suppressions: 0,
          recipients: 0,
        },
      };
    }

    const consentEvents = await ctx.db
      .query("subscriberConsentEvents")
      .withIndex("by_subscriber", (q) => q.eq("subscriberId", subscriber._id))
      .collect();
    const divisionPrefs = await ctx.db
      .query("subscriberDivisionPreferences")
      .withIndex("by_subscriber", (q) => q.eq("subscriberId", subscriber._id))
      .collect();
    const emailLinkTokens = await ctx.db
      .query("emailLinkTokens")
      .withIndex("by_subscriber_and_purpose", (q) =>
        q.eq("subscriberId", subscriber._id),
      )
      .collect();
    const suppressions = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_subscriber_and_type", (q) =>
        q.eq("subscriberId", subscriber._id),
      )
      .collect();
    const recipients = await ctx.db
      .query("newsletterRecipients")
      .withIndex("by_subscriber_and_createdAt", (q) =>
        q.eq("subscriberId", subscriber._id),
      )
      .collect();

    return {
      found: true,
      subscriberId: subscriber._id,
      normalizedEmail,
      related: {
        consentEvents: consentEvents.length,
        divisionPrefs: divisionPrefs.length,
        emailLinkTokens: emailLinkTokens.length,
        suppressions: suppressions.length,
        recipients: recipients.length,
      },
    };
  },
});

export const deleteSubscriberByEmail = internalMutation({
  args: { email: v.string() },
  returns: v.object({
    deleted: v.boolean(),
    normalizedEmail: v.string(),
    removed: v.object({
      consentEvents: v.number(),
      divisionPrefs: v.number(),
      emailLinkTokens: v.number(),
      suppressions: v.number(),
      recipients: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeAndValidateEmail(args.email);
    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_normalized_email", (q) =>
        q.eq("normalizedEmail", normalizedEmail),
      )
      .unique();
    if (!subscriber) {
      return {
        deleted: false,
        normalizedEmail,
        removed: {
          consentEvents: 0,
          divisionPrefs: 0,
          emailLinkTokens: 0,
          suppressions: 0,
          recipients: 0,
        },
      };
    }

    let consentEvents = 0;
    let divisionPrefs = 0;
    let emailLinkTokens = 0;
    let suppressions = 0;
    let recipients = 0;

    for (const row of await ctx.db
      .query("subscriberConsentEvents")
      .withIndex("by_subscriber", (q) => q.eq("subscriberId", subscriber._id))
      .collect()) {
      await ctx.db.delete(row._id);
      consentEvents += 1;
    }
    for (const row of await ctx.db
      .query("subscriberDivisionPreferences")
      .withIndex("by_subscriber", (q) => q.eq("subscriberId", subscriber._id))
      .collect()) {
      await ctx.db.delete(row._id);
      divisionPrefs += 1;
    }
    for (const row of await ctx.db
      .query("emailLinkTokens")
      .withIndex("by_subscriber_and_purpose", (q) =>
        q.eq("subscriberId", subscriber._id),
      )
      .collect()) {
      await ctx.db.delete(row._id);
      emailLinkTokens += 1;
    }
    for (const row of await ctx.db
      .query("emailSuppressions")
      .withIndex("by_subscriber_and_type", (q) =>
        q.eq("subscriberId", subscriber._id),
      )
      .collect()) {
      await ctx.db.delete(row._id);
      suppressions += 1;
    }
    for (const row of await ctx.db
      .query("newsletterRecipients")
      .withIndex("by_subscriber_and_createdAt", (q) =>
        q.eq("subscriberId", subscriber._id),
      )
      .collect()) {
      await ctx.db.delete(row._id);
      recipients += 1;
    }

    await ctx.db.delete(subscriber._id);

    return {
      deleted: true,
      normalizedEmail,
      removed: {
        consentEvents,
        divisionPrefs,
        emailLinkTokens,
        suppressions,
        recipients,
      },
    };
  },
});

export const mintTestLinksForEmail = internalMutation({
  args: {
    email: v.string(),
    articleSlug: v.optional(v.string()),
  },
  returns: v.object({
    unsubscribeToken: v.string(),
    preferencesToken: v.string(),
    articleToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeAndValidateEmail(args.email);
    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_normalized_email", (q) =>
        q.eq("normalizedEmail", normalizedEmail),
      )
      .unique();
    if (!subscriber) {
      throw new Error("Subscriber not found");
    }
    const now = Date.now();
    const unsubscribeToken = await mintEmailLinkToken(ctx, {
      purpose: "newsletter_unsubscribe",
      subscriberId: subscriber._id,
      expiresAt: now + UNSUBSCRIBE_TTL_MS,
    });
    const preferencesToken = await mintEmailLinkToken(ctx, {
      purpose: "preferences_access",
      subscriberId: subscriber._id,
      expiresAt: now + PREFERENCES_ACCESS_TTL_MS,
    });
    const articleToken = await mintEmailLinkToken(ctx, {
      purpose: "article_access",
      subscriberId: subscriber._id,
      expiresAt: now + ARTICLE_ACCESS_TTL_MS,
      ...(args.articleSlug ? { articleSlug: args.articleSlug } : {}),
    });
    return { unsubscribeToken, preferencesToken, articleToken };
  },
});
