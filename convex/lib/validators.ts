import { v } from "convex/values";

export const adminRoleValidator = v.union(
  v.literal("admin"),
  v.literal("journalist"),
  v.literal("viewer"),
);

export const consentSourceValidator = v.union(
  v.literal("article_gate"),
  v.literal("homepage_inline"),
  v.literal("preferences_resubscribe"),
);

export const deliveryStatusValidator = v.union(
  v.literal("unknown"),
  v.literal("deliverable"),
  v.literal("bounced"),
);

export const preferenceStatusValidator = v.union(
  v.literal("pending"),
  v.literal("complete"),
);
