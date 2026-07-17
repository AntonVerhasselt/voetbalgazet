import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { normalizeAndValidateEmail } from "./lib/email";
import {
  divisionOptions,
  teamOptions,
} from "./lib/preferenceCatalog";
import { consumeSignupRateLimit, hashRateLimitValue } from "./lib/rateLimit";
import { verifyUnsubscribeToken } from "./lib/emailLinkToken";
import {
  applySubscriberPreferences,
  getVerifiedSubscriber,
  preferenceKeysForSubscriber,
} from "./lib/subscriberPreferences";
import {
  divisionOptionValidator,
  preferenceSnapshotValidator,
  signupFlowValidator,
  teamOptionValidator,
} from "./lib/validators";

const acceptedResponse = { accepted: true } as const;
const CURRENT_CONSENT_VERSION = "2026-07-16";
const completeSignupArgs = {
  email: v.string(),
  website: v.optional(v.string()),
  divisionKeys: v.array(v.string()),
  teamKey: v.optional(v.string()),
  clientIpHash: v.optional(v.string()),
};

type CompleteSignupArgs = {
  email: string;
  website?: string;
  divisionKeys: string[];
  teamKey?: string;
  clientIpHash?: string;
};

type SignupSource = "article_gate" | "homepage_inline";

async function beginSubscriberSignup(
  ctx: MutationCtx,
  email: string,
  clientIpHash?: string,
): Promise<{
  accepted: true;
  flow: "preferences" | "continue_reading";
}> {
  const normalizedEmail = normalizeAndValidateEmail(email);
  await consumeSignupRateLimit(
    ctx,
    normalizedEmail,
    Date.now(),
    clientIpHash,
  );
  const existingSubscriber = await ctx.db
    .query("subscribers")
    .withIndex("by_normalized_email", (query) =>
      query.eq("normalizedEmail", normalizedEmail),
    )
    .unique();

  if (existingSubscriber) {
    return {
      accepted: true,
      flow:
        existingSubscriber.preferenceStatus === "pending" &&
        !existingSubscriber.siteAccess
          ? "preferences"
          : "continue_reading",
    };
  }

  await ctx.db.insert("subscribers", {
    normalizedEmail,
    signupStartedAt: Date.now(),
    siteAccess: false,
    newsletterSubscribed: false,
    divisionIds: [],
    preferenceStatus: "pending",
    emailDeliveryStatus: "unknown",
  });

  return { accepted: true, flow: "preferences" };
}

async function completeSubscriberSignup(
  ctx: MutationCtx,
  args: CompleteSignupArgs,
  source: SignupSource,
): Promise<typeof acceptedResponse> {
  if (args.website && args.website.trim().length > 0) {
    return acceptedResponse;
  }

  const normalizedEmail = normalizeAndValidateEmail(args.email);
  await consumeSignupRateLimit(
    ctx,
    normalizedEmail,
    Date.now(),
    args.clientIpHash,
  );
  let subscriber = await ctx.db
    .query("subscribers")
    .withIndex("by_normalized_email", (query) =>
      query.eq("normalizedEmail", normalizedEmail),
    )
    .unique();

  if (subscriber?.siteAccess || subscriber?.preferenceStatus === "complete") {
    return acceptedResponse;
  }

  if (!subscriber) {
    const subscriberId = await ctx.db.insert("subscribers", {
      normalizedEmail,
      signupStartedAt: Date.now(),
      siteAccess: false,
      newsletterSubscribed: false,
      divisionIds: [],
      preferenceStatus: "pending",
      emailDeliveryStatus: "unknown",
    });
    subscriber = await ctx.db.get("subscribers", subscriberId);
  }
  if (!subscriber) {
    throw new Error("De inschrijving kon niet worden opgeslagen.");
  }

  await applySubscriberPreferences(
    ctx,
    subscriber._id,
    args.divisionKeys,
    args.teamKey,
  );

  const capturedAt = Date.now();
  await ctx.db.patch("subscribers", subscriber._id, {
    siteAccess: true,
    siteAccessGrantedAt: capturedAt,
    newsletterSubscribed: true,
    newsletterSubscribedAt: capturedAt,
    unsubscribedAt: undefined,
    consentVersion: CURRENT_CONSENT_VERSION,
    consentCapturedAt: capturedAt,
    consentSource: source,
  });
  await ctx.db.insert("subscriberConsentEvents", {
    subscriberId: subscriber._id,
    action: "subscribe",
    consentVersion: CURRENT_CONSENT_VERSION,
    source,
    capturedAt,
  });

  return acceptedResponse;
}

export const listPreferenceCatalog = query({
  args: {},
  returns: v.object({
    divisions: v.array(divisionOptionValidator),
    teams: v.array(teamOptionValidator),
  }),
  handler: async () => {
    return {
      divisions: divisionOptions.map((division) => ({
        key: division.key,
        label: division.label,
        provinceKey: division.provinceKey,
        provinceLabel: division.provinceLabel,
      })),
      teams: teamOptions.map((team) => ({
        key: team.key,
        label: team.label,
        provinceKey: team.provinceKey,
        divisionKeys: [...team.divisionKeys],
      })),
    };
  },
});

export const beginSignup = mutation({
  args: {
    email: v.string(),
    website: v.optional(v.string()),
    clientIpHash: v.optional(v.string()),
  },
  returns: v.object({
    accepted: v.literal(true),
    flow: signupFlowValidator,
  }),
  handler: async (ctx, args) => {
    if (args.website && args.website.trim().length > 0) {
      return { accepted: true, flow: "continue_reading" } as const;
    }

    return await beginSubscriberSignup(
      ctx,
      args.email,
      args.clientIpHash,
    );
  },
});

export const completeArticleSignup = mutation({
  args: completeSignupArgs,
  returns: v.object({ accepted: v.literal(true) }),
  handler: async (ctx, args) => {
    return await completeSubscriberSignup(ctx, args, "article_gate");
  },
});

export const completeHomepageSignup = mutation({
  args: completeSignupArgs,
  returns: v.object({ accepted: v.literal(true) }),
  handler: async (ctx, args) => {
    return await completeSubscriberSignup(ctx, args, "homepage_inline");
  },
});

export const requestReturningAccess = mutation({
  args: {
    email: v.string(),
    website: v.optional(v.string()),
    clientIpHash: v.optional(v.string()),
  },
  returns: v.object({ accepted: v.literal(true) }),
  handler: async (ctx, args) => {
    if (!args.website?.trim()) {
      const normalizedEmail = normalizeAndValidateEmail(args.email);
      await consumeSignupRateLimit(
        ctx,
        normalizedEmail,
        Date.now(),
        args.clientIpHash,
      );
    }
    return acceptedResponse;
  },
});

export const getMyPreferences = query({
  args: {},
  returns: preferenceSnapshotValidator,
  handler: async (ctx) => {
    const subscriber = await getVerifiedSubscriber(ctx);
    const keys = await preferenceKeysForSubscriber(ctx, subscriber);
    return {
      ...keys,
      newsletterSubscribed: subscriber.newsletterSubscribed,
    };
  },
});

export const updateMyPreferences = mutation({
  args: {
    divisionKeys: v.array(v.string()),
    teamKey: v.optional(v.string()),
  },
  returns: v.object({ saved: v.literal(true) }),
  handler: async (ctx, args) => {
    const subscriber = await getVerifiedSubscriber(ctx);
    await applySubscriberPreferences(
      ctx,
      subscriber._id,
      args.divisionKeys,
      args.teamKey,
    );
    if (!subscriber.emailVerifiedAt) {
      await ctx.db.patch("subscribers", subscriber._id, {
        emailVerifiedAt: Date.now(),
      });
    }
    return { saved: true } as const;
  },
});

export const startSignup = mutation({
  args: {
    email: v.string(),
    website: v.optional(v.string()),
    clientIpHash: v.optional(v.string()),
  },
  returns: v.object({ accepted: v.literal(true) }),
  handler: async (ctx, args) => {
    if (args.website && args.website.trim().length > 0) {
      return acceptedResponse;
    }
    await beginSubscriberSignup(ctx, args.email, args.clientIpHash);
    return acceptedResponse;
  },
});

export const confirmUnsubscribe = mutation({
  args: {
    token: v.string(),
    source: v.union(
      v.literal("email_unsubscribe"),
      v.literal("one_click_unsubscribe"),
    ),
  },
  returns: v.object({
    unsubscribed: v.literal(true),
    siteAccessPreserved: v.literal(true),
  }),
  handler: async (ctx, args) => {
    const payload = await verifyUnsubscribeToken(args.token);
    if (!payload) {
      throw new Error("Ongeldige of verlopen uitschrijflink.");
    }

    const normalizedEmail = normalizeAndValidateEmail(payload.email);
    const now = Date.now();
    const rateKeyHash = hashRateLimitValue(`unsubscribe:${normalizedEmail}`);
    const bucket = await ctx.db
      .query("signupRateLimits")
      .withIndex("by_key_hash", (query) => query.eq("keyHash", rateKeyHash))
      .unique();
    if (!bucket || now - bucket.windowStartedAt >= 60 * 60 * 1000) {
      if (bucket) {
        await ctx.db.patch("signupRateLimits", bucket._id, {
          count: 1,
          windowStartedAt: now,
        });
      } else {
        await ctx.db.insert("signupRateLimits", {
          keyHash: rateKeyHash,
          count: 1,
          windowStartedAt: now,
        });
      }
    } else if (bucket.count >= 20) {
      throw new Error(
        "Te veel uitschrijfpogingen. Wacht even en probeer later opnieuw.",
      );
    } else {
      await ctx.db.patch("signupRateLimits", bucket._id, {
        count: bucket.count + 1,
      });
    }

    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_normalized_email", (query) =>
        query.eq("normalizedEmail", normalizedEmail),
      )
      .unique();

    // Always return success shape to avoid email enumeration after auth.
    if (!subscriber) {
      return {
        unsubscribed: true as const,
        siteAccessPreserved: true as const,
      };
    }

    if (!subscriber.newsletterSubscribed && subscriber.unsubscribedAt) {
      return {
        unsubscribed: true as const,
        siteAccessPreserved: true as const,
      };
    }

    const capturedAt = Date.now();
    await ctx.db.patch("subscribers", subscriber._id, {
      newsletterSubscribed: false,
      unsubscribedAt: capturedAt,
    });
    await ctx.db.insert("subscriberConsentEvents", {
      subscriberId: subscriber._id,
      action: "unsubscribe",
      consentVersion: subscriber.consentVersion ?? CURRENT_CONSENT_VERSION,
      source: args.source,
      capturedAt,
    });

    return {
      unsubscribed: true as const,
      siteAccessPreserved: true as const,
    };
  },
});

export const markEmailVerifiedFromAuth = internalMutation({
  args: {
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeAndValidateEmail(args.email);
    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_normalized_email", (query) =>
        query.eq("normalizedEmail", normalizedEmail),
      )
      .unique();
    if (!subscriber || subscriber.emailVerifiedAt) {
      return null;
    }
    await ctx.db.patch("subscribers", subscriber._id, {
      emailVerifiedAt: Date.now(),
    });
    return null;
  },
});
