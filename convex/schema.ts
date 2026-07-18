import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { audienceRuleGroupValidator } from "./lib/audienceRules";
import {
  adminRoleValidator,
  campaignStatusValidator,
  consentSourceValidator,
  deliveryStatusValidator,
  emailMediaStatusValidator,
  preferenceStatusValidator,
  recipientStatusValidator,
  revisionReasonValidator,
  sendStatusValidator,
  suppressionTypeValidator,
  transactionalDefinitionStatusValidator,
  transactionalEmailTypeValidator,
  auditActionValidator,
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
  })
    .index("by_normalized_email", ["normalizedEmail"])
    .index("by_newsletter_subscribed", ["newsletterSubscribed"])
    .index("by_favorite_team_and_newsletter", [
      "favoriteTeamId",
      "newsletterSubscribed",
    ]),

  subscriberConsentEvents: defineTable({
    subscriberId: v.id("subscribers"),
    action: v.union(v.literal("subscribe"), v.literal("unsubscribe")),
    consentVersion: v.string(),
    source: consentSourceValidator,
    capturedAt: v.number(),
  }).index("by_subscriber", ["subscriberId"]),

  subscriberDivisionPreferences: defineTable({
    subscriberId: v.id("subscribers"),
    divisionId: v.id("divisions"),
  })
    .index("by_subscriber", ["subscriberId"])
    .index("by_division", ["divisionId"])
    .index("by_subscriber_and_division", ["subscriberId", "divisionId"])
    .index("by_division_and_subscriber", ["divisionId", "subscriberId"]),

  signupRateLimits: defineTable({
    keyHash: v.string(),
    count: v.number(),
    windowStartedAt: v.number(),
  }).index("by_key_hash", ["keyHash"]),

  emailLinkTokens: defineTable({
    tokenHash: v.string(),
    purpose: v.union(
      v.literal("newsletter_unsubscribe"),
      v.literal("article_access"),
      v.literal("preferences_access"),
    ),
    subscriberId: v.id("subscribers"),
    expiresAt: v.number(),
    createdAt: v.number(),
    usedAt: v.optional(v.number()),
    articleSlug: v.optional(v.string()),
    sendId: v.optional(v.id("newsletterSends")),
    campaignId: v.optional(v.id("newsletterCampaigns")),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_subscriber_and_purpose", ["subscriberId", "purpose"])
    .index("by_expires_at", ["expiresAt"]),

  appRuntimeSettings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  agentAccessEvents: defineTable({
    at: v.number(),
    result: v.union(
      v.literal("success"),
      v.literal("failure"),
      v.literal("disabled"),
    ),
    ipHash: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }).index("by_at", ["at"]),

  emailSenderProfiles: defineTable({
    internalName: v.string(),
    fromName: v.string(),
    fromAddress: v.string(),
    replyTo: v.string(),
    isDefault: v.boolean(),
    domainVerified: v.boolean(),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_default", ["isDefault"]),

  newsletterCampaigns: defineTable({
    internalName: v.string(),
    subject: v.string(),
    preheader: v.optional(v.string()),
    status: campaignStatusValidator,
    activeRevisionId: v.optional(v.id("newsletterRevisions")),
    sendRevisionId: v.optional(v.id("newsletterRevisions")),
    audienceDefinitionId: v.optional(v.id("newsletterAudienceDefinitions")),
    senderProfileId: v.id("emailSenderProfiles"),
    scheduledFor: v.optional(v.number()),
    timezone: v.string(),
    scheduleGeneration: v.optional(v.number()),
    scheduledJobId: v.optional(v.id("_scheduled_functions")),
    sendRequestedAt: v.optional(v.number()),
    sendRequestedBy: v.optional(v.id("users")),
    recipientCount: v.optional(v.number()),
    eligibleCountAtPreview: v.optional(v.number()),
    lastSuccessfulTestRevisionId: v.optional(v.id("newsletterRevisions")),
    lastSuccessfulTestAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    clientRequestId: v.optional(v.string()),
    duplicatedFromCampaignId: v.optional(v.id("newsletterCampaigns")),
    documentJson: v.string(),
    previewHtml: v.optional(v.string()),
    previewText: v.optional(v.string()),
    previewGeneratedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    revisionNumber: v.number(),
  })
    .index("by_status_and_updatedAt", ["status", "updatedAt"])
    .index("by_status_and_scheduledFor", ["status", "scheduledFor"])
    .index("by_createdBy_and_updatedAt", ["createdBy", "updatedAt"])
    .index("by_sentAt", ["sentAt"])
    .index("by_clientRequestId", ["clientRequestId"]),

  newsletterRevisions: defineTable({
    campaignId: v.id("newsletterCampaigns"),
    version: v.number(),
    editorFormat: v.literal("react-email-editor"),
    editorFormatVersion: v.number(),
    documentJson: v.string(),
    html: v.string(),
    text: v.string(),
    rendererVersion: v.string(),
    themeVersion: v.string(),
    footerVersion: v.string(),
    subject: v.string(),
    preheader: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    reason: revisionReasonValidator,
  })
    .index("by_campaign_and_version", ["campaignId", "version"])
    .index("by_campaign_and_createdAt", ["campaignId", "createdAt"]),

  newsletterAudienceDefinitions: defineTable({
    campaignId: v.id("newsletterCampaigns"),
    newsletterSubscribedOnly: v.literal(true),
    /** Legacy flat filters — kept in sync for simple division/team rules. */
    divisionIds: v.array(v.id("divisions")),
    favoriteTeamIds: v.array(v.id("teams")),
    combineDimensionsWith: v.literal("and"),
    /**
     * Rule engine: OR of groups, AND within each group.
     * Empty array = all eligible subscribers. Undefined = derive from legacy.
     */
    ruleGroups: v.optional(v.array(audienceRuleGroupValidator)),
    excludeUnverified: v.boolean(),
    confirmedAt: v.optional(v.number()),
    confirmedBy: v.optional(v.id("users")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    version: v.number(),
  }).index("by_campaign", ["campaignId"]),

  newsletterSends: defineTable({
    campaignId: v.id("newsletterCampaigns"),
    revisionId: v.id("newsletterRevisions"),
    audienceDefinitionId: v.id("newsletterAudienceDefinitions"),
    status: sendStatusValidator,
    analyticsId: v.string(),
    requestedBy: v.id("users"),
    requestedAt: v.number(),
    scheduledFor: v.optional(v.number()),
    preparationCursor: v.optional(v.string()),
    expectedRecipientCount: v.optional(v.number()),
    queuedCount: v.number(),
    deliveredCount: v.number(),
    bouncedCount: v.number(),
    complainedCount: v.number(),
    failedCount: v.number(),
    suppressedCount: v.number(),
    openedCount: v.number(),
    clickedCount: v.number(),
    completedAt: v.optional(v.number()),
    lastErrorCode: v.optional(v.string()),
    clientRequestId: v.string(),
    bounceSpikeAlertedAt: v.optional(v.number()),
    complaintSpikeAlertedAt: v.optional(v.number()),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_status_and_requestedAt", ["status", "requestedAt"])
    .index("by_clientRequestId", ["clientRequestId"])
    .index("by_analyticsId", ["analyticsId"]),

  newsletterRecipients: defineTable({
    sendId: v.id("newsletterSends"),
    campaignId: v.id("newsletterCampaigns"),
    subscriberId: v.id("subscribers"),
    status: recipientStatusValidator,
    resendEmailId: v.optional(v.string()),
    idempotencyKey: v.string(),
    exclusionReason: v.optional(v.string()),
    queuedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    lastEventAt: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_send_and_subscriber", ["sendId", "subscriberId"])
    .index("by_send_and_status", ["sendId", "status"])
    .index("by_resendEmailId", ["resendEmailId"])
    .index("by_subscriber_and_createdAt", ["subscriberId", "createdAt"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  newsletterDeliveryEvents: defineTable({
    recipientId: v.id("newsletterRecipients"),
    sendId: v.id("newsletterSends"),
    providerEventId: v.string(),
    eventType: v.string(),
    providerTimestamp: v.number(),
    receivedAt: v.number(),
    reasonCode: v.optional(v.string()),
    schemaVersion: v.number(),
  })
    .index("by_providerEventId", ["providerEventId"])
    .index("by_recipient_and_providerTimestamp", [
      "recipientId",
      "providerTimestamp",
    ])
    .index("by_send_and_eventType", ["sendId", "eventType"])
    .index("by_receivedAt", ["receivedAt"]),

  emailSuppressions: defineTable({
    subscriberId: v.optional(v.id("subscribers")),
    normalizedEmail: v.string(),
    type: suppressionTypeValidator,
    sourceId: v.optional(v.string()),
    createdAt: v.number(),
    clearedAt: v.optional(v.number()),
    clearedBy: v.optional(v.id("users")),
  })
    .index("by_email_and_type", ["normalizedEmail", "type"])
    .index("by_subscriber_and_type", ["subscriberId", "type"])
    .index("by_email_and_createdAt", ["normalizedEmail", "createdAt"]),

  emailMedia: defineTable({
    r2Key: v.string(),
    publicUrl: v.string(),
    mimeType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
    status: emailMediaStatusValidator,
    usedBySentEmail: v.boolean(),
  })
    .index("by_r2Key", ["r2Key"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_uploadedBy_and_createdAt", ["uploadedBy", "createdAt"]),

  transactionalEmailDefinitions: defineTable({
    type: transactionalEmailTypeValidator,
    displayName: v.string(),
    draftRevisionId: v.optional(v.id("transactionalEmailRevisions")),
    activeRevisionId: v.optional(v.id("transactionalEmailRevisions")),
    allowedVariableKeys: v.array(v.string()),
    requiredVariableKeys: v.array(v.string()),
    status: transactionalDefinitionStatusValidator,
    documentJson: v.string(),
    subject: v.string(),
    preheader: v.optional(v.string()),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
    lastSuccessfulTestAt: v.optional(v.number()),
    lastSuccessfulTestFingerprint: v.optional(v.string()),
  }).index("by_type", ["type"]),

  transactionalEmailRevisions: defineTable({
    definitionId: v.id("transactionalEmailDefinitions"),
    version: v.number(),
    documentJson: v.string(),
    html: v.string(),
    text: v.string(),
    subject: v.string(),
    preheader: v.optional(v.string()),
    usedVariableKeys: v.array(v.string()),
    rendererVersion: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    publishedAt: v.optional(v.number()),
    publishedBy: v.optional(v.id("users")),
    lastSuccessfulTestAt: v.optional(v.number()),
  })
    .index("by_definition_and_version", ["definitionId", "version"])
    .index("by_definition_and_createdAt", ["definitionId", "createdAt"]),

  newsletterAuditEvents: defineTable({
    action: auditActionValidator,
    actorUserId: v.optional(v.id("users")),
    campaignId: v.optional(v.id("newsletterCampaigns")),
    sendId: v.optional(v.id("newsletterSends")),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_campaign_and_createdAt", ["campaignId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),
});
