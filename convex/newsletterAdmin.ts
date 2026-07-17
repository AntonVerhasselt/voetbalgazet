import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { adminMutation, adminQuery, viewerQuery } from "./lib/adminAuth";
import {
  COMPLIANCE,
  campaignStatusLabel,
  emptyEditorDocumentJson,
} from "./lib/compliance";
import {
  renderTransactionalEmail,
  validateDocumentForSend,
  parseEditorDocument,
} from "./lib/emailRender";
import {
  TRANSACTIONAL_TYPE_SEEDS,
  seedForType,
  transactionalContentFingerprint,
} from "./lib/transactionalTypes";
import {
  transactionalDefinitionStatusValidator,
  transactionalEmailTypeValidator,
} from "./lib/validators";
import { normalizeAndValidateEmail } from "./lib/email";
import {
  MARKETING_KILL_SWITCH_KEY,
  marketingKillSwitchValueValidator,
  readMarketingKillSwitch,
} from "./lib/runtimeSettings";
import { resend } from "./resendClient";

function siteBaseUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/u, "");
}

function isSendingDomainVerified(fromAddress: string): boolean {
  const domain = fromAddress.split("@")[1]?.toLowerCase();
  return domain === COMPLIANCE.sendingDomain;
}

async function resolveSender(ctx: MutationCtx): Promise<{
  fromName: string;
  fromAddress: string;
  replyTo: string;
}> {
  const sender = await ctx.db
    .query("emailSenderProfiles")
    .withIndex("by_default", (q) => q.eq("isDefault", true))
    .unique();
  return {
    fromName: sender?.fromName ?? COMPLIANCE.defaultFromName,
    fromAddress: sender?.fromAddress ?? COMPLIANCE.defaultFromAddress,
    replyTo: sender?.replyTo ?? COMPLIANCE.replyTo,
  };
}

async function resolveTransactionalContent(
  ctx: MutationCtx,
  type: (typeof TRANSACTIONAL_TYPE_SEEDS)[number]["type"],
): Promise<{
  documentJson: string;
  subject: string;
  preheader: string | undefined;
  allowedVariableKeys: string[];
  requiredVariableKeys: string[];
  disabled: boolean;
}> {
  const definition = await ctx.db
    .query("transactionalEmailDefinitions")
    .withIndex("by_type", (q) => q.eq("type", type))
    .unique();
  if (definition) {
    let documentJson = definition.documentJson;
    let subject = definition.subject;
    let preheader = definition.preheader;
    if (definition.activeRevisionId) {
      const revision = await ctx.db.get(definition.activeRevisionId);
      if (revision) {
        documentJson = revision.documentJson;
        subject = revision.subject;
        preheader = revision.preheader;
      }
    }
    return {
      documentJson,
      subject,
      preheader,
      allowedVariableKeys: definition.allowedVariableKeys,
      requiredVariableKeys: definition.requiredVariableKeys,
      disabled: definition.status === "disabled",
    };
  }
  const seed = seedForType(type);
  return {
    documentJson: seed.documentJson,
    subject: seed.subject,
    preheader: undefined,
    allowedVariableKeys: [...seed.allowedVariableKeys],
    requiredVariableKeys: [...seed.requiredVariableKeys],
    disabled: false,
  };
}

/**
 * Send a visually managed transactional email via the Resend component.
 * Falls back to seed content when the admin catalog row is not yet created.
 */
export const sendTransactionalEmail = internalMutation({
  args: {
    type: transactionalEmailTypeValidator,
    toEmail: v.string(),
    variables: v.record(v.string(), v.string()),
  },
  returns: v.object({ sent: v.boolean() }),
  handler: async (ctx, args) => {
    const toEmail = normalizeAndValidateEmail(args.toEmail);
    const content = await resolveTransactionalContent(ctx, args.type);
    if (content.disabled) {
      return { sent: false };
    }
    for (const key of content.requiredVariableKeys) {
      if (!args.variables[key]) {
        throw new Error(`Verplichte variabele ontbreekt: ${key}`);
      }
    }
    const rendered = renderTransactionalEmail({
      documentJson: content.documentJson,
      subject: content.subject,
      preheader: content.preheader,
      variables: args.variables,
    });
    let resolvedSubject = content.subject;
    for (const [key, value] of Object.entries(args.variables)) {
      resolvedSubject = resolvedSubject.replaceAll(`{{${key}}}`, value);
    }
    const sender = await resolveSender(ctx);
    await resend.sendEmail(ctx, {
      from: `${sender.fromName} <${sender.fromAddress}>`,
      to: toEmail,
      replyTo: [sender.replyTo],
      subject: resolvedSubject,
      html: rendered.html,
      text: rendered.text,
    });
    return { sent: true };
  },
});

export const listDefinitions = viewerQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("transactionalEmailDefinitions"),
      type: transactionalEmailTypeValidator,
      displayName: v.string(),
      status: transactionalDefinitionStatusValidator,
      subject: v.string(),
      updatedAt: v.number(),
      hasActiveRevision: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query("transactionalEmailDefinitions").take(20);
    return rows.map((row) => ({
      _id: row._id,
      type: row.type,
      displayName: row.displayName,
      status: row.status,
      subject: row.subject,
      updatedAt: row.updatedAt,
      hasActiveRevision: row.activeRevisionId !== undefined,
    }));
  },
});

export const getDefinition = viewerQuery({
  args: { type: transactionalEmailTypeValidator },
  returns: v.union(
    v.object({
      _id: v.id("transactionalEmailDefinitions"),
      type: transactionalEmailTypeValidator,
      displayName: v.string(),
      status: transactionalDefinitionStatusValidator,
      subject: v.string(),
      preheader: v.optional(v.string()),
      documentJson: v.string(),
      allowedVariableKeys: v.array(v.string()),
      requiredVariableKeys: v.array(v.string()),
      updatedAt: v.number(),
      canEdit: v.boolean(),
      lastSuccessfulTestAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("transactionalEmailDefinitions")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .unique();
    if (!row) {
      return null;
    }
    return {
      _id: row._id,
      type: row.type,
      displayName: row.displayName,
      status: row.status,
      subject: row.subject,
      preheader: row.preheader,
      documentJson: row.documentJson,
      allowedVariableKeys: row.allowedVariableKeys,
      requiredVariableKeys: row.requiredVariableKeys,
      updatedAt: row.updatedAt,
      canEdit: ctx.adminUser.role === "admin",
      lastSuccessfulTestAt: row.lastSuccessfulTestAt,
    };
  },
});

export const ensureDefinitions = adminMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    let created = 0;
    const now = Date.now();
    for (const def of TRANSACTIONAL_TYPE_SEEDS) {
      const existing = await ctx.db
        .query("transactionalEmailDefinitions")
        .withIndex("by_type", (q) => q.eq("type", def.type))
        .unique();
      if (existing) {
        continue;
      }
      await ctx.db.insert("transactionalEmailDefinitions", {
        type: def.type,
        displayName: def.displayName,
        allowedVariableKeys: [...def.allowedVariableKeys],
        requiredVariableKeys: [...def.requiredVariableKeys],
        status: "draft",
        documentJson: def.documentJson,
        subject: def.subject,
        updatedBy: ctx.adminUser._id,
        updatedAt: now,
      });
      created += 1;
    }
    return created;
  },
});

export const updateDraft = adminMutation({
  args: {
    type: transactionalEmailTypeValidator,
    subject: v.optional(v.string()),
    preheader: v.optional(v.string()),
    documentJson: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("transactionalEmailDefinitions")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .unique();
    if (!row) {
      throw new Error("Dienstmail niet gevonden. Seed eerst de types.");
    }
    if (args.documentJson !== undefined) {
      parseEditorDocument(args.documentJson);
    }
    await ctx.db.patch(row._id, {
      subject: args.subject?.trim() ?? row.subject,
      preheader: args.preheader ?? row.preheader,
      documentJson: args.documentJson ?? row.documentJson,
      updatedBy: ctx.adminUser._id,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const publishRevision = adminMutation({
  args: { type: transactionalEmailTypeValidator },
  returns: v.id("transactionalEmailRevisions"),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("transactionalEmailDefinitions")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .unique();
    if (!row) {
      throw new Error("Dienstmail niet gevonden.");
    }
    validateDocumentForSend(row.documentJson);
    for (const key of row.requiredVariableKeys) {
      if (!row.documentJson.includes(`{{${key}}}`)) {
        throw new Error(`Verplichte variabele ontbreekt: {{${key}}}`);
      }
    }
    const fingerprint = transactionalContentFingerprint({
      subject: row.subject,
      preheader: row.preheader,
      documentJson: row.documentJson,
    });
    if (
      !row.lastSuccessfulTestAt ||
      row.lastSuccessfulTestFingerprint !== fingerprint
    ) {
      throw new Error(
        "Verstuur eerst een geslaagde testmail van de huidige inhoud.",
      );
    }
    const rendered = renderTransactionalEmail({
      documentJson: row.documentJson,
      subject: row.subject,
      preheader: row.preheader,
      variables: Object.fromEntries(
        row.requiredVariableKeys.map((key) => [
          key,
          `https://example.com/${key}`,
        ]),
      ),
    });
    const latest = await ctx.db
      .query("transactionalEmailRevisions")
      .withIndex("by_definition_and_version", (q) =>
        q.eq("definitionId", row._id),
      )
      .order("desc")
      .first();
    const version = (latest?.version ?? 0) + 1;
    const now = Date.now();
    const revisionId = await ctx.db.insert("transactionalEmailRevisions", {
      definitionId: row._id,
      version,
      documentJson: row.documentJson,
      html: rendered.html,
      text: rendered.text,
      subject: row.subject,
      preheader: row.preheader,
      usedVariableKeys: row.allowedVariableKeys.filter((key) =>
        row.documentJson.includes(`{{${key}}}`),
      ),
      rendererVersion: rendered.rendererVersion,
      createdBy: ctx.adminUser._id,
      createdAt: now,
      publishedAt: now,
      publishedBy: ctx.adminUser._id,
      lastSuccessfulTestAt: row.lastSuccessfulTestAt,
    });
    await ctx.db.patch(row._id, {
      activeRevisionId: revisionId,
      status: "active",
      updatedAt: now,
      updatedBy: ctx.adminUser._id,
    });
    return revisionId;
  },
});

export const requestTest = adminMutation({
  args: {
    type: transactionalEmailTypeValidator,
    toEmail: v.string(),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const toEmail = normalizeAndValidateEmail(args.toEmail);
    const row = await ctx.db
      .query("transactionalEmailDefinitions")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .unique();
    if (!row) {
      throw new Error("Dienstmail niet gevonden.");
    }
    const fixtureVars = Object.fromEntries(
      row.allowedVariableKeys.map((key) => [
        key,
        `https://example.com/preview/${key}`,
      ]),
    );
    const rendered = renderTransactionalEmail({
      documentJson: row.documentJson,
      subject: row.subject,
      preheader: row.preheader,
      variables: fixtureVars,
    });
    const sender = await resolveSender(ctx);
    await resend.sendEmail(ctx, {
      from: `${sender.fromName} <${sender.fromAddress}>`,
      to: toEmail,
      replyTo: [sender.replyTo],
      subject: `[TEST] ${row.subject}`,
      html: rendered.html,
      text: rendered.text,
    });
    const now = Date.now();
    await ctx.db.patch(row._id, {
      lastSuccessfulTestAt: now,
      lastSuccessfulTestFingerprint: transactionalContentFingerprint({
        subject: row.subject,
        preheader: row.preheader,
        documentJson: row.documentJson,
      }),
      updatedAt: now,
      updatedBy: ctx.adminUser._id,
    });
    return { ok: true };
  },
});

export const listSubscribers = viewerQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    newsletterOnly: v.optional(v.boolean()),
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("subscribers"),
        maskedEmail: v.string(),
        newsletterSubscribed: v.boolean(),
        siteAccess: v.boolean(),
        emailDeliveryStatus: v.string(),
        preferenceStatus: v.string(),
        signupStartedAt: v.number(),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const page = args.newsletterOnly
      ? await ctx.db
          .query("subscribers")
          .withIndex("by_newsletter_subscribed", (q) =>
            q.eq("newsletterSubscribed", true),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("subscribers")
          .order("desc")
          .paginate(args.paginationOpts);

    return {
      page: page.page.map((subscriber) => {
        const [local, domain] = subscriber.normalizedEmail.split("@");
        return {
          _id: subscriber._id,
          maskedEmail: `${(local ?? "*").slice(0, 1)}***@${domain ?? "***"}`,
          newsletterSubscribed: subscriber.newsletterSubscribed,
          siteAccess: subscriber.siteAccess,
          emailDeliveryStatus: subscriber.emailDeliveryStatus,
          preferenceStatus: subscriber.preferenceStatus,
          signupStartedAt: subscriber.signupStartedAt,
        };
      }),
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const getSenderSettings = adminQuery({
  args: {},
  returns: v.object({
    fromName: v.string(),
    fromAddress: v.string(),
    replyTo: v.string(),
    domainVerified: v.boolean(),
    mediaCdnHost: v.string(),
    sendingDomain: v.string(),
    liveSendEnabled: v.boolean(),
    marketingKillSwitch: marketingKillSwitchValueValidator,
  }),
  handler: async (ctx) => {
    const sender = await ctx.db
      .query("emailSenderProfiles")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .unique();
    const fromAddress =
      sender?.fromAddress ?? COMPLIANCE.defaultFromAddress;
    return {
      fromName: sender?.fromName ?? COMPLIANCE.defaultFromName,
      fromAddress,
      replyTo: sender?.replyTo ?? COMPLIANCE.replyTo,
      domainVerified:
        sender?.domainVerified ?? isSendingDomainVerified(fromAddress),
      mediaCdnHost: COMPLIANCE.mediaCdnHost,
      sendingDomain: COMPLIANCE.sendingDomain,
      liveSendEnabled: process.env.NEWSLETTER_LIVE_SEND === "true",
      marketingKillSwitch: await readMarketingKillSwitch(ctx),
    };
  },
});

export const getMarketingKillSwitch = viewerQuery({
  args: {},
  returns: marketingKillSwitchValueValidator,
  handler: async (ctx) => {
    return await readMarketingKillSwitch(ctx);
  },
});

export const setMarketingKillSwitch = adminMutation({
  args: {
    value: marketingKillSwitchValueValidator,
    reason: v.string(),
  },
  returns: marketingKillSwitchValueValidator,
  handler: async (ctx, args) => {
    const reason = args.reason.trim();
    if (reason.length < 3) {
      throw new Error("Geef een reden op (minstens 3 tekens).");
    }
    if (reason.length > 500) {
      throw new Error("Reden mag maximaal 500 tekens zijn.");
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("appRuntimeSettings")
      .withIndex("by_key", (q) => q.eq("key", MARKETING_KILL_SWITCH_KEY))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: now,
        updatedBy: ctx.adminUser._id,
      });
    } else {
      await ctx.db.insert("appRuntimeSettings", {
        key: MARKETING_KILL_SWITCH_KEY,
        value: args.value,
        updatedAt: now,
        updatedBy: ctx.adminUser._id,
      });
    }
    await ctx.db.insert("newsletterAuditEvents", {
      action: "kill_switch_toggled",
      actorUserId: ctx.adminUser._id,
      metadata: JSON.stringify({ value: args.value, reason }),
      createdAt: now,
    });
    return args.value;
  },
});

const adminAlertStatusValidator = v.union(
  v.literal("failed"),
  v.literal("partially_failed"),
  v.literal("sent"),
  v.literal("cancelled"),
  v.literal("started"),
  v.literal("bounce_spike"),
  v.literal("complaint_spike"),
);

/**
 * Email all active Admins + initiating Journalist on send outcomes / spikes.
 * Dedupes addresses. Uses the admin_send_alert template.
 */
export const dispatchAdminSendAlert = internalMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    sendId: v.optional(v.id("newsletterSends")),
    status: adminAlertStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return null;
    }
    const send = args.sendId ? await ctx.db.get(args.sendId) : null;

    const definition = await ctx.db
      .query("transactionalEmailDefinitions")
      .withIndex("by_type", (q) => q.eq("type", "admin_send_alert"))
      .unique();
    if (definition?.status === "disabled") {
      return null;
    }

    let documentJson =
      definition?.documentJson ?? seedForType("admin_send_alert").documentJson;
    let subject =
      definition?.subject ?? seedForType("admin_send_alert").subject;
    let preheader = definition?.preheader;
    if (definition?.activeRevisionId) {
      const revision = await ctx.db.get(definition.activeRevisionId);
      if (revision) {
        documentJson = revision.documentJson;
        subject = revision.subject;
        preheader = revision.preheader;
      }
    }

    const recipientEmails = new Set<string>();
    const staff = await ctx.db.query("users").take(200);
    for (const user of staff) {
      if (user.disabledAt !== undefined) {
        continue;
      }
      if (user.role === "admin") {
        recipientEmails.add(user.email.trim().toLowerCase());
      }
    }
    const initiatorId = send?.requestedBy ?? campaign.sendRequestedBy;
    if (initiatorId) {
      const initiator = await ctx.db.get(initiatorId);
      if (initiator && initiator.disabledAt === undefined) {
        recipientEmails.add(initiator.email.trim().toLowerCase());
      }
    }
    if (recipientEmails.size === 0) {
      recipientEmails.add(COMPLIANCE.replyTo);
    }

    const statusLabel = campaignStatusLabel(args.status);
    const dashboardUrl = `${siteBaseUrl()}/admin/nieuwsbrieven/${campaign._id}/resultaten`;
    const variables = {
      campaignName: campaign.internalName,
      status: statusLabel,
      dashboardUrl,
    };
    const rendered = renderTransactionalEmail({
      documentJson,
      subject,
      preheader,
      variables,
    });
    const resolvedSubject = subject
      .replaceAll("{{campaignName}}", campaign.internalName)
      .replaceAll("{{status}}", statusLabel)
      .replaceAll("{{dashboardUrl}}", dashboardUrl);

    const sender = await resolveSender(ctx);

    let sentCount = 0;
    for (const to of recipientEmails) {
      await resend.sendEmail(ctx, {
        from: `${sender.fromName} <${sender.fromAddress}>`,
        to,
        replyTo: [sender.replyTo],
        subject: resolvedSubject,
        html: rendered.html,
        text: rendered.text,
      });
      sentCount += 1;
    }

    await ctx.db.insert("newsletterAuditEvents", {
      action: "admin_send_alert_sent",
      campaignId: args.campaignId,
      sendId: args.sendId,
      metadata: JSON.stringify({
        status: args.status,
        recipientCount: sentCount,
      }),
      createdAt: Date.now(),
    });
    return null;
  },
});

export const updateSenderSettings = adminMutation({
  args: {
    fromName: v.string(),
    fromAddress: v.string(),
    replyTo: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const fromAddress = normalizeAndValidateEmail(args.fromAddress);
    const replyTo = normalizeAndValidateEmail(args.replyTo);
    const domainVerified = isSendingDomainVerified(fromAddress);
    const existing = await ctx.db
      .query("emailSenderProfiles")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        fromName: args.fromName.trim(),
        fromAddress,
        replyTo,
        domainVerified,
        updatedBy: ctx.adminUser._id,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("emailSenderProfiles", {
        internalName: "Standaard",
        fromName: args.fromName.trim(),
        fromAddress,
        replyTo,
        isDefault: true,
        domainVerified,
        createdBy: ctx.adminUser._id,
        updatedBy: ctx.adminUser._id,
        createdAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

// Keep emptyEditorDocumentJson referenced for transactional resets if needed.
void emptyEditorDocumentJson;
