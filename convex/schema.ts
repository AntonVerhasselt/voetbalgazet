import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  adminRoleValidator,
  consentSourceValidator,
  deliveryStatusValidator,
  preferenceStatusValidator,
} from "./lib/validators";

export default defineSchema({
  users: defineTable({
    authUserId: v.string(),
    email: v.string(),
    role: adminRoleValidator,
    disabledAt: v.optional(v.number()),
  })
    .index("by_auth_user", ["authUserId"])
    .index("by_email", ["email"]),

  divisions: defineTable({
    externalKey: v.string(),
    label: v.string(),
    provinceKey: v.string(),
    level: v.number(),
    active: v.boolean(),
    sortOrder: v.number(),
  }).index("by_external_key", ["externalKey"]),

  teams: defineTable({
    externalKey: v.string(),
    label: v.string(),
    provinceKey: v.string(),
    divisionIds: v.array(v.id("divisions")),
    active: v.boolean(),
  }).index("by_external_key", ["externalKey"]),

  subscribers: defineTable({
    normalizedEmail: v.string(),
    signupStartedAt: v.number(),
    emailVerifiedAt: v.optional(v.number()),
    siteAccess: v.boolean(),
    siteAccessGrantedAt: v.optional(v.number()),
    newsletterSubscribed: v.boolean(),
    newsletterSubscribedAt: v.optional(v.number()),
    unsubscribedAt: v.optional(v.number()),
    consentVersion: v.optional(v.string()),
    consentCapturedAt: v.optional(v.number()),
    consentSource: v.optional(consentSourceValidator),
    divisionIds: v.array(v.id("divisions")),
    favoriteTeamId: v.optional(v.id("teams")),
    preferenceStatus: preferenceStatusValidator,
    emailDeliveryStatus: deliveryStatusValidator,
  }).index("by_normalized_email", ["normalizedEmail"]),

  subscriberConsentEvents: defineTable({
    subscriberId: v.id("subscribers"),
    action: v.union(v.literal("subscribe"), v.literal("unsubscribe")),
    consentVersion: v.string(),
    source: consentSourceValidator,
    capturedAt: v.number(),
  }).index("by_subscriber", ["subscriberId"]),
});
