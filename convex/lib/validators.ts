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

export const signupFlowValidator = v.union(
  v.literal("preferences"),
  v.literal("continue_reading"),
);

export const divisionOptionValidator = v.object({
  key: v.string(),
  label: v.string(),
  provinceKey: v.string(),
  provinceLabel: v.string(),
});

export const teamOptionValidator = v.object({
  key: v.string(),
  label: v.string(),
  provinceKey: v.string(),
  divisionKeys: v.array(v.string()),
});

export const preferenceSnapshotValidator = v.object({
  divisionKeys: v.array(v.string()),
  teamKey: v.union(v.string(), v.null()),
  newsletterSubscribed: v.boolean(),
});
