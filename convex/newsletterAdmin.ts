import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { adminMutation, adminQuery, viewerQuery } from "./lib/adminAuth";
import {
  COMPLIANCE,
  emptyEditorDocumentJson,
} from "./lib/compliance";
import {
  renderTransactionalEmail,
  validateDocumentForSend,
  parseEditorDocument,
} from "./lib/emailRender";
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

function isSendingDomainVerified(fromAddress: string): boolean {
  const domain = fromAddress.split("@")[1]?.toLowerCase();
  return domain === COMPLIANCE.sendingDomain;
}

const TRANSACTIONAL_TYPES = [
  {
    type: "welcome" as const,
    displayName: "Welkomstmail",
    allowedVariableKeys: ["confirmUrl", "firstName"],
    requiredVariableKeys: ["confirmUrl"],
    subject: "Welkom bij De Voetbalgazet",
    documentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Welkom bij De Voetbalgazet" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Je kunt meteen verder lezen. Bevestig je e-mailadres om later je voorkeuren veilig aan te passen.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "{{confirmUrl}}" }],
        },
      ],
    }),
  },
  {
    type: "magic_link" as const,
    displayName: "Magic link",
    allowedVariableKeys: ["magicUrl"],
    requiredVariableKeys: ["magicUrl"],
    subject: "Je aanmeldlink voor De Voetbalgazet",
    documentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Meld je aan" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Gebruik deze link om jezelf te bevestigen. De link vervalt na korte tijd.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "{{magicUrl}}" }],
        },
      ],
    }),
  },
  {
    type: "verify_email" as const,
    displayName: "E-mailverificatie",
    allowedVariableKeys: ["verifyUrl"],
    requiredVariableKeys: ["verifyUrl"],
    subject: "Bevestig je e-mailadres",
    documentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Bevestig je e-mailadres" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "{{verifyUrl}}" }],
        },
      ],
    }),
  },
  {
    type: "unsubscribe_confirmed" as const,
    displayName: "Uitschrijving bevestigd",
    allowedVariableKeys: ["preferencesUrl"],
    requiredVariableKeys: [],
    subject: "Je bent uitgeschreven van de nieuwsbrief",
    documentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Uitschrijving bevestigd" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Je ontvangt geen wekelijkse nieuwsbrief meer. Je website-toegang blijft behouden.",
            },
          ],
        },
      ],
    }),
  },
] as const;

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
    };
  },
});

export const ensureDefinitions = adminMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    let created = 0;
    const now = Date.now();
    for (const def of TRANSACTIONAL_TYPES) {
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
    await resend.sendEmail(ctx, {
      from: `${COMPLIANCE.defaultFromName} <${COMPLIANCE.defaultFromAddress}>`,
      to: toEmail,
      replyTo: [COMPLIANCE.replyTo],
      subject: `[TEST] ${row.subject}`,
      html: rendered.html,
      text: rendered.text,
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
  args: { value: marketingKillSwitchValueValidator },
  returns: marketingKillSwitchValueValidator,
  handler: async (ctx, args) => {
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
    return args.value;
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
