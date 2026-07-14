import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { vOnEmailEventArgs } from "@convex-dev/resend";

const subscriberReturnValidator = v.object({
  _id: v.id("subscribers"),
  _creationTime: v.number(),
  normalizedEmail: v.string(),
  emailVerifiedAt: v.optional(v.number()),
  siteAccess: v.boolean(),
  siteAccessGrantedAt: v.optional(v.number()),
  newsletterSubscribed: v.boolean(),
  newsletterSubscribedAt: v.optional(v.number()),
  unsubscribedAt: v.optional(v.number()),
  consentVersion: v.optional(v.string()),
  consentCapturedAt: v.optional(v.number()),
  consentSource: v.optional(v.string()),
  divisionIds: v.array(v.id("divisions")),
  favoriteTeamId: v.optional(v.id("teams")),
  resendContactId: v.optional(v.string()),
  emailDeliveryStatus: v.union(
    v.literal("unknown"),
    v.literal("deliverable"),
    v.literal("bounced"),
  ),
});

export const list = query({
  args: {},
  returns: v.array(subscriberReturnValidator),
  handler: async (ctx) => {
    return await ctx.db.query("subscribers").collect();
  },
});

export const getById = internalQuery({
  args: { subscriberId: v.id("subscribers") },
  returns: v.union(subscriberReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get("subscribers", args.subscriberId);
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    divisionIds: v.array(v.id("divisions")),
    favoriteTeamId: v.optional(v.id("teams")),
    newsletterSubscribed: v.optional(v.boolean()),
    siteAccess: v.optional(v.boolean()),
  },
  returns: v.id("subscribers"),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("normalizedEmail", normalizedEmail))
      .unique();

    if (existing) {
      throw new Error("Subscriber already exists");
    }

    const now = Date.now();
    return await ctx.db.insert("subscribers", {
      normalizedEmail,
      siteAccess: args.siteAccess ?? true,
      siteAccessGrantedAt: now,
      newsletterSubscribed: args.newsletterSubscribed ?? true,
      newsletterSubscribedAt: now,
      divisionIds: args.divisionIds,
      favoriteTeamId: args.favoriteTeamId,
      consentVersion: "1.0",
      consentCapturedAt: now,
      consentSource: "admin",
      emailDeliveryStatus: "unknown",
    });
  },
});

export const markBounced = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("normalizedEmail", normalizedEmail))
      .unique();

    if (subscriber) {
      await ctx.db.patch("subscribers", subscriber._id, {
        emailDeliveryStatus: "bounced",
        newsletterSubscribed: false,
      });
    }

    return null;
  },
});

export const unsubscribe = mutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("normalizedEmail", normalizedEmail))
      .unique();

    if (!subscriber) {
      throw new Error("Subscriber not found");
    }

    await ctx.db.patch("subscribers", subscriber._id, {
      newsletterSubscribed: false,
      unsubscribedAt: Date.now(),
    });

    return null;
  },
});

export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.event.type === "email.bounced") {
      const toAddress = args.event.data.to[0];
      if (toAddress) {
        const normalizedEmail = toAddress.trim().toLowerCase();
        const subscriber = await ctx.db
          .query("subscribers")
          .withIndex("by_email", (q) => q.eq("normalizedEmail", normalizedEmail))
          .unique();

        if (subscriber) {
          await ctx.db.patch("subscribers", subscriber._id, {
            emailDeliveryStatus: "bounced",
            newsletterSubscribed: false,
          });
        }
      }
    }
    return null;
  },
});
