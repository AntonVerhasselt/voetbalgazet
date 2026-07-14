import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const audienceFilterValidator = v.object({
  newsletterSubscribedOnly: v.boolean(),
  divisionIds: v.optional(v.array(v.id("divisions"))),
  favoriteTeamIds: v.optional(v.array(v.id("teams"))),
  matchMode: v.optional(v.union(v.literal("any"), v.literal("all"))),
});

const emailStatusValidator = v.union(
  v.literal("draft"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("failed"),
);

export default defineSchema({
  divisions: defineTable({
    name: v.string(),
    province: v.string(),
    level: v.string(),
    slug: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_province", ["province"]),

  teams: defineTable({
    name: v.string(),
    divisionId: v.id("divisions"),
    slug: v.string(),
  })
    .index("by_division", ["divisionId"])
    .index("by_slug", ["slug"]),

  subscribers: defineTable({
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
  })
    .index("by_email", ["normalizedEmail"])
    .index("by_newsletter_subscribed", ["newsletterSubscribed"]),

  newsletterEmails: defineTable({
    name: v.string(),
    subject: v.string(),
    preheader: v.optional(v.string()),
    editorHtml: v.string(),
    editorJson: v.optional(v.string()),
    renderedHtml: v.optional(v.string()),
    status: emailStatusValidator,
    audienceFilter: v.optional(audienceFilterValidator),
    scheduledAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    recipientCount: v.optional(v.number()),
    deliveredCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    duplicatedFromId: v.optional(v.id("newsletterEmails")),
    createdAt: v.number(),
    updatedAt: v.number(),
    sendError: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_sent", ["sentAt"]),

  emailSendLogs: defineTable({
    emailId: v.id("newsletterEmails"),
    subscriberId: v.id("subscribers"),
    resendEmailId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("failed"),
    ),
    errorMessage: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  })
    .index("by_email", ["emailId"])
    .index("by_subscriber", ["subscriberId"]),
});
