import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { normalizeAndValidateEmail } from "./lib/email";

const acceptedResponse = { accepted: true } as const;

async function startSubscriberSignup(
  ctx: MutationCtx,
  email: string,
): Promise<typeof acceptedResponse> {
  const normalizedEmail = normalizeAndValidateEmail(email);
  const existingSubscriber = await ctx.db
    .query("subscribers")
    .withIndex("by_normalized_email", (query) =>
      query.eq("normalizedEmail", normalizedEmail),
    )
    .unique();

  if (existingSubscriber) {
    return acceptedResponse;
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

  return acceptedResponse;
}

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

    return await startSubscriberSignup(ctx, args.email);
  },
});
