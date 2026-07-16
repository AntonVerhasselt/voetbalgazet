import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { normalizeAndValidateEmail } from "./lib/email";
import {
  divisionOptions,
  teamOptions,
} from "./lib/preferenceCatalog";
import {
  applySubscriberPreferences,
  getVerifiedSubscriber,
  preferenceKeysForSubscriber,
} from "./lib/subscriberPreferences";
import {
  consentSourceValidator,
  divisionOptionValidator,
  preferenceSnapshotValidator,
  signupFlowValidator,
  teamOptionValidator,
} from "./lib/validators";

const acceptedResponse = { accepted: true } as const;

async function beginSubscriberSignup(
  ctx: MutationCtx,
  email: string,
): Promise<{
  accepted: true;
  flow: "preferences" | "continue_reading";
}> {
  const normalizedEmail = normalizeAndValidateEmail(email);
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
  },
  returns: v.object({
    accepted: v.literal(true),
    flow: signupFlowValidator,
  }),
  handler: async (ctx, args) => {
    if (args.website && args.website.trim().length > 0) {
      return { accepted: true, flow: "continue_reading" } as const;
    }

    return await beginSubscriberSignup(ctx, args.email);
  },
});

export const completeSignup = mutation({
  args: {
    email: v.string(),
    website: v.optional(v.string()),
    divisionKeys: v.array(v.string()),
    teamKey: v.optional(v.string()),
    consentVersion: v.string(),
    consentSource: consentSourceValidator,
  },
  returns: v.object({ accepted: v.literal(true) }),
  handler: async (ctx, args) => {
    if (args.website && args.website.trim().length > 0) {
      return acceptedResponse;
    }
    if (!args.consentVersion.trim()) {
      throw new Error("De consentversie ontbreekt.");
    }

    const normalizedEmail = normalizeAndValidateEmail(args.email);
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
      consentVersion: args.consentVersion,
      consentCapturedAt: capturedAt,
      consentSource: args.consentSource,
    });
    await ctx.db.insert("subscriberConsentEvents", {
      subscriberId: subscriber._id,
      action: "subscribe",
      consentVersion: args.consentVersion,
      source: args.consentSource,
      capturedAt,
    });

    return acceptedResponse;
  },
});

export const requestReturningAccess = mutation({
  args: {
    email: v.string(),
    website: v.optional(v.string()),
  },
  returns: v.object({ accepted: v.literal(true) }),
  handler: async (_ctx, args) => {
    if (!args.website?.trim()) {
      normalizeAndValidateEmail(args.email);
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
  },
  returns: v.object({ accepted: v.literal(true) }),
  handler: async (ctx, args) => {
    if (args.website && args.website.trim().length > 0) {
      return acceptedResponse;
    }
    await beginSubscriberSignup(ctx, args.email);
    return acceptedResponse;
  },
});
