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
  v.literal("email_unsubscribe"),
  v.literal("one_click_unsubscribe"),
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

export const campaignStatusValidator = v.union(
  v.literal("draft"),
  v.literal("scheduled"),
  v.literal("preparing"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("partially_failed"),
  v.literal("failed"),
  v.literal("cancelled"),
);

export const revisionReasonValidator = v.union(
  v.literal("autosave"),
  v.literal("manual"),
  v.literal("test"),
  v.literal("send"),
);

export const sendStatusValidator = v.union(
  v.literal("preparing"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("partially_failed"),
  v.literal("failed"),
  v.literal("cancelled"),
);

export const recipientStatusValidator = v.union(
  v.literal("prepared"),
  v.literal("queued"),
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("bounced"),
  v.literal("complained"),
  v.literal("failed"),
  v.literal("suppressed"),
);

export const suppressionTypeValidator = v.union(
  v.literal("unsubscribe"),
  v.literal("hard_bounce"),
  v.literal("complaint"),
  v.literal("manual"),
);

export const emailMediaStatusValidator = v.union(
  v.literal("uploading"),
  v.literal("ready"),
  v.literal("rejected"),
  v.literal("deleted"),
);

export const transactionalEmailTypeValidator = v.union(
  v.literal("welcome"),
  v.literal("magic_link"),
  v.literal("verify_email"),
  v.literal("unsubscribe_confirmed"),
  v.literal("preferences_changed"),
  v.literal("admin_send_alert"),
);

export const transactionalDefinitionStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("disabled"),
);

export const auditActionValidator = v.union(
  v.literal("campaign_created"),
  v.literal("campaign_updated"),
  v.literal("campaign_duplicated"),
  v.literal("campaign_deleted"),
  v.literal("revision_saved"),
  v.literal("audience_updated"),
  v.literal("test_requested"),
  v.literal("test_completed"),
  v.literal("test_failed"),
  v.literal("scheduled"),
  v.literal("rescheduled"),
  v.literal("schedule_cancelled"),
  v.literal("send_confirmed"),
  v.literal("schedule_overridden_send_now"),
  v.literal("sender_updated"),
  v.literal("transactional_updated"),
  v.literal("transactional_published"),
  v.literal("suppression_cleared"),
  v.literal("failed_recipients_recovered"),
  v.literal("taxonomy_synced"),
  v.literal("kill_switch_toggled"),
  v.literal("admin_send_alert_sent"),
);

export const campaignSummaryValidator = v.object({
  _id: v.id("newsletterCampaigns"),
  internalName: v.string(),
  subject: v.string(),
  preheader: v.optional(v.string()),
  status: campaignStatusValidator,
  scheduledFor: v.optional(v.number()),
  sentAt: v.optional(v.number()),
  recipientCount: v.optional(v.number()),
  updatedAt: v.number(),
  updatedByEmail: v.optional(v.string()),
  audienceDescription: v.string(),
});

export const audiencePreviewValidator = v.object({
  eligibleBeforeFilters: v.number(),
  eligibleAfterFilters: v.number(),
  excludedUnsubscribe: v.number(),
  excludedSuppression: v.number(),
  excludedDivisionFilter: v.number(),
  excludedTeamFilter: v.number(),
  percentOfActive: v.number(),
  calculatedAt: v.number(),
  description: v.string(),
  /** True when the scan hit the preview cap and counts may be incomplete. */
  isApproximate: v.boolean(),
  sample: v.array(
    v.object({
      maskedEmail: v.string(),
      divisionLabels: v.array(v.string()),
      teamLabel: v.union(v.string(), v.null()),
    }),
  ),
});
