import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import {
  editorMutation,
  editorQuery,
  viewerQuery,
} from "./lib/adminAuth";
import {
  COMPLIANCE,
  EDITOR_FORMAT,
  EDITOR_FORMAT_VERSION,
  defaultCampaignName,
  emptyEditorDocumentJson,
} from "./lib/compliance";
import {
  parseEditorDocument,
  renderCampaignEmail,
  validateDocumentForSend,
} from "./lib/emailRender";
import {
  audiencePreviewValidator,
  campaignStatusValidator,
  campaignSummaryValidator,
} from "./lib/validators";
import { mergeCampaignStatusPages } from "./lib/campaignList";
import { computeAudiencePreview } from "./lib/newsletterAudiencePreview";
import {
  audienceDescription,
  audit,
  ensureDefaultSender,
  siteBaseUrl,
} from "./lib/newsletterCampaignShared";

export const listCampaigns = viewerQuery({
  args: {
    tab: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("all"),
    ),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(campaignSummaryValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const statuses =
      args.tab === "draft"
        ? (["draft"] as const)
        : args.tab === "scheduled"
          ? (["scheduled", "preparing", "sending"] as const)
          : args.tab === "sent"
            ? ([
                "sent",
                "partially_failed",
                "failed",
                "cancelled",
              ] as const)
            : null;

    let page;
    if (statuses === null) {
      page = await ctx.db
        .query("newsletterCampaigns")
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (statuses.length === 1) {
      page = await ctx.db
        .query("newsletterCampaigns")
        .withIndex("by_status_and_updatedAt", (q) =>
          q.eq("status", statuses[0]),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      const cursorUpdatedAt = args.paginationOpts.cursor
        ? Number(args.paginationOpts.cursor)
        : undefined;
      if (
        args.paginationOpts.cursor &&
        !Number.isFinite(cursorUpdatedAt)
      ) {
        throw new Error("Ongeldige pagineringcursor.");
      }
      const perStatus: Doc<"newsletterCampaigns">[][] = [];
      for (const status of statuses) {
        const rows = await ctx.db
          .query("newsletterCampaigns")
          .withIndex("by_status_and_updatedAt", (q) =>
            cursorUpdatedAt !== undefined
              ? q.eq("status", status).lt("updatedAt", cursorUpdatedAt)
              : q.eq("status", status),
          )
          .order("desc")
          .take(args.paginationOpts.numItems);
        perStatus.push(rows);
      }
      page = mergeCampaignStatusPages(perStatus, args.paginationOpts.numItems);
    }

    const summaries = [];
    for (const campaign of page.page) {
      const updater = await ctx.db.get(campaign.updatedBy);
      let description = "Alle actieve abonnees";
      if (campaign.audienceDefinitionId) {
        const definition = await ctx.db.get(campaign.audienceDefinitionId);
        if (definition) {
          description = await audienceDescription(ctx, definition);
        }
      }
      summaries.push({
        _id: campaign._id,
        internalName: campaign.internalName,
        subject: campaign.subject,
        preheader: campaign.preheader,
        status: campaign.status,
        scheduledFor: campaign.scheduledFor,
        sentAt: campaign.sentAt,
        recipientCount: campaign.recipientCount,
        updatedAt: campaign.updatedAt,
        updatedByEmail: updater?.email,
        audienceDescription: description,
      });
    }

    return {
      page: summaries,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const getCampaign = viewerQuery({
  args: { campaignId: v.id("newsletterCampaigns") },
  returns: v.union(
    v.object({
      campaign: v.object({
        _id: v.id("newsletterCampaigns"),
        internalName: v.string(),
        subject: v.string(),
        preheader: v.optional(v.string()),
        status: campaignStatusValidator,
        documentJson: v.string(),
        revisionNumber: v.number(),
        scheduledFor: v.optional(v.number()),
        timezone: v.string(),
        recipientCount: v.optional(v.number()),
        eligibleCountAtPreview: v.optional(v.number()),
        lastSuccessfulTestRevisionId: v.optional(v.id("newsletterRevisions")),
        lastSuccessfulTestAt: v.optional(v.number()),
        sentAt: v.optional(v.number()),
        updatedAt: v.number(),
        previewHtml: v.optional(v.string()),
        previewText: v.optional(v.string()),
        canEdit: v.boolean(),
      }),
      audience: v.union(
        v.object({
          _id: v.id("newsletterAudienceDefinitions"),
          divisionIds: v.array(v.id("divisions")),
          favoriteTeamIds: v.array(v.id("teams")),
          confirmedAt: v.optional(v.number()),
          version: v.number(),
          description: v.string(),
        }),
        v.null(),
      ),
      sender: v.object({
        fromName: v.string(),
        fromAddress: v.string(),
        replyTo: v.string(),
        domainVerified: v.boolean(),
      }),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return null;
    }
    const sender = await ctx.db.get(campaign.senderProfileId);
    if (!sender) {
      return null;
    }
    let audience = null;
    if (campaign.audienceDefinitionId) {
      const definition = await ctx.db.get(campaign.audienceDefinitionId);
      if (definition) {
        audience = {
          _id: definition._id,
          divisionIds: definition.divisionIds,
          favoriteTeamIds: definition.favoriteTeamIds,
          confirmedAt: definition.confirmedAt,
          version: definition.version,
          description: await audienceDescription(ctx, definition),
        };
      }
    }
    return {
      campaign: {
        _id: campaign._id,
        internalName: campaign.internalName,
        subject: campaign.subject,
        preheader: campaign.preheader,
        status: campaign.status,
        documentJson: campaign.documentJson,
        revisionNumber: campaign.revisionNumber,
        scheduledFor: campaign.scheduledFor,
        timezone: campaign.timezone,
        recipientCount: campaign.recipientCount,
        eligibleCountAtPreview: campaign.eligibleCountAtPreview,
        lastSuccessfulTestRevisionId: campaign.lastSuccessfulTestRevisionId,
        lastSuccessfulTestAt: campaign.lastSuccessfulTestAt,
        sentAt: campaign.sentAt,
        updatedAt: campaign.updatedAt,
        previewHtml: campaign.previewHtml,
        previewText: campaign.previewText,
        canEdit: campaign.status === "draft",
      },
      audience,
      sender: {
        fromName: sender.fromName,
        fromAddress: sender.fromAddress,
        replyTo: sender.replyTo,
        domainVerified: sender.domainVerified,
      },
    };
  },
});

export const createCampaign = editorMutation({
  args: {},
  returns: v.id("newsletterCampaigns"),
  handler: async (ctx) => {
    const now = Date.now();
    const sender = await ensureDefaultSender(ctx, ctx.adminUser._id);
    const campaignId = await ctx.db.insert("newsletterCampaigns", {
      internalName: defaultCampaignName(new Date(now)),
      subject: "",
      preheader: "",
      status: "draft",
      senderProfileId: sender._id,
      timezone: COMPLIANCE.timezone,
      documentJson: emptyEditorDocumentJson(),
      createdBy: ctx.adminUser._id,
      updatedBy: ctx.adminUser._id,
      createdAt: now,
      updatedAt: now,
      revisionNumber: 0,
    });
    const audienceId = await ctx.db.insert("newsletterAudienceDefinitions", {
      campaignId,
      newsletterSubscribedOnly: true,
      divisionIds: [],
      favoriteTeamIds: [],
      combineDimensionsWith: "and",
      excludeUnverified: false,
      createdBy: ctx.adminUser._id,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    await ctx.db.patch(campaignId, { audienceDefinitionId: audienceId });
    await audit(ctx, {
      action: "campaign_created",
      actorUserId: ctx.adminUser._id,
      campaignId,
    });
    return campaignId;
  },
});

export const updateDraft = editorMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    expectedRevisionNumber: v.number(),
    internalName: v.optional(v.string()),
    subject: v.optional(v.string()),
    preheader: v.optional(v.string()),
    documentJson: v.optional(v.string()),
  },
  returns: v.object({
    revisionNumber: v.number(),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Nieuwsbrief niet gevonden.");
    }
    if (campaign.status !== "draft") {
      throw new Error("Alleen concepten kunnen worden bewerkt.");
    }
    if (campaign.revisionNumber !== args.expectedRevisionNumber) {
      throw new Error(
        "Deze nieuwsbrief is elders gewijzigd. Herlaad de pagina.",
      );
    }
    if (args.documentJson !== undefined) {
      parseEditorDocument(args.documentJson);
    }
    const now = Date.now();
    const nextRevision = campaign.revisionNumber + 1;
    const nextSubject =
      args.subject !== undefined ? args.subject.trim() : campaign.subject;
    const nextPreheader =
      args.preheader !== undefined ? args.preheader.trim() : campaign.preheader;
    const nextDocumentJson = args.documentJson ?? campaign.documentJson;
    const testInvalidated =
      nextSubject !== campaign.subject ||
      (nextPreheader ?? "") !== (campaign.preheader ?? "") ||
      nextDocumentJson !== campaign.documentJson;
    const patch: Partial<Doc<"newsletterCampaigns">> = {
      updatedAt: now,
      updatedBy: ctx.adminUser._id,
      revisionNumber: nextRevision,
    };
    if (testInvalidated) {
      patch.lastSuccessfulTestRevisionId = undefined;
      patch.lastSuccessfulTestAt = undefined;
    }
    if (args.internalName !== undefined) {
      const name = args.internalName.trim();
      if (!name) {
        throw new Error("Interne naam mag niet leeg zijn.");
      }
      patch.internalName = name;
    }
    if (args.subject !== undefined) {
      patch.subject = nextSubject;
    }
    if (args.preheader !== undefined) {
      patch.preheader = nextPreheader;
    }
    if (args.documentJson !== undefined) {
      patch.documentJson = nextDocumentJson;
      const rendered = renderCampaignEmail({
        documentJson: nextDocumentJson,
        subject: nextSubject || "Voorbeeld",
        preheader: nextPreheader,
        links: {
          unsubscribeUrl: `${siteBaseUrl()}/uitschrijven`,
          preferencesUrl: `${siteBaseUrl()}/email/voorkeuren`,
          privacyUrl: `${siteBaseUrl()}${COMPLIANCE.privacyPath}`,
          siteUrl: siteBaseUrl(),
        },
      });
      patch.previewHtml = rendered.html;
      patch.previewText = rendered.text;
      patch.previewGeneratedAt = now;
    }
    await ctx.db.patch(args.campaignId, patch);
    await audit(ctx, {
      action: "campaign_updated",
      actorUserId: ctx.adminUser._id,
      campaignId: args.campaignId,
    });
    return { revisionNumber: nextRevision, updatedAt: now };
  },
});

export const saveRevision = editorMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    reason: v.union(
      v.literal("manual"),
      v.literal("test"),
      v.literal("send"),
    ),
  },
  returns: v.id("newsletterRevisions"),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Nieuwsbrief niet gevonden.");
    }
    if (campaign.status !== "draft" && args.reason !== "send") {
      throw new Error("Revisie alleen mogelijk voor concepten.");
    }
    if (!campaign.subject.trim()) {
      throw new Error("Vul een onderwerp in.");
    }
    validateDocumentForSend(campaign.documentJson);
    const rendered = renderCampaignEmail({
      documentJson: campaign.documentJson,
      subject: campaign.subject,
      preheader: campaign.preheader,
      links: {
        unsubscribeUrl: `${siteBaseUrl()}/uitschrijven`,
        preferencesUrl: `${siteBaseUrl()}/email/voorkeuren`,
        privacyUrl: `${siteBaseUrl()}${COMPLIANCE.privacyPath}`,
        siteUrl: siteBaseUrl(),
      },
    });
    const latest = await ctx.db
      .query("newsletterRevisions")
      .withIndex("by_campaign_and_version", (q) =>
        q.eq("campaignId", args.campaignId),
      )
      .order("desc")
      .first();
    const version = (latest?.version ?? 0) + 1;
    const revisionId = await ctx.db.insert("newsletterRevisions", {
      campaignId: args.campaignId,
      version,
      editorFormat: EDITOR_FORMAT,
      editorFormatVersion: EDITOR_FORMAT_VERSION,
      documentJson: campaign.documentJson,
      html: rendered.html,
      text: rendered.text,
      rendererVersion: rendered.rendererVersion,
      themeVersion: rendered.themeVersion,
      footerVersion: rendered.footerVersion,
      subject: campaign.subject,
      preheader: campaign.preheader,
      createdBy: ctx.adminUser._id,
      createdAt: Date.now(),
      reason: args.reason,
    });
    await ctx.db.patch(args.campaignId, {
      activeRevisionId: revisionId,
      previewHtml: rendered.html,
      previewText: rendered.text,
      previewGeneratedAt: Date.now(),
    });
    await audit(ctx, {
      action: "revision_saved",
      actorUserId: ctx.adminUser._id,
      campaignId: args.campaignId,
      metadata: args.reason,
    });
    return revisionId;
  },
});

export const duplicateCampaign = editorMutation({
  args: { campaignId: v.id("newsletterCampaigns") },
  returns: v.id("newsletterCampaigns"),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.campaignId);
    if (!source) {
      throw new Error("Bronnieuwsbrief niet gevonden.");
    }
    const now = Date.now();
    const campaignId = await ctx.db.insert("newsletterCampaigns", {
      internalName: `${source.internalName} (kopie)`,
      subject: source.subject,
      preheader: source.preheader,
      status: "draft",
      senderProfileId: source.senderProfileId,
      timezone: source.timezone,
      documentJson: source.documentJson,
      previewHtml: source.previewHtml,
      previewText: source.previewText,
      duplicatedFromCampaignId: source._id,
      createdBy: ctx.adminUser._id,
      updatedBy: ctx.adminUser._id,
      createdAt: now,
      updatedAt: now,
      revisionNumber: 0,
    });
    const sourceAudience = source.audienceDefinitionId
      ? await ctx.db.get(source.audienceDefinitionId)
      : null;
    const audienceId = await ctx.db.insert("newsletterAudienceDefinitions", {
      campaignId,
      newsletterSubscribedOnly: true,
      divisionIds: sourceAudience?.divisionIds ?? [],
      favoriteTeamIds: sourceAudience?.favoriteTeamIds ?? [],
      combineDimensionsWith: "and",
      excludeUnverified: false,
      createdBy: ctx.adminUser._id,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    await ctx.db.patch(campaignId, { audienceDefinitionId: audienceId });
    await audit(ctx, {
      action: "campaign_duplicated",
      actorUserId: ctx.adminUser._id,
      campaignId,
      metadata: String(args.campaignId),
    });
    return campaignId;
  },
});

export const deleteDraft = editorMutation({
  args: { campaignId: v.id("newsletterCampaigns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Nieuwsbrief niet gevonden.");
    }
    if (campaign.status !== "draft") {
      throw new Error("Alleen concepten kunnen worden verwijderd.");
    }
    if (campaign.audienceDefinitionId) {
      await ctx.db.delete(campaign.audienceDefinitionId);
    }
    const revisions = await ctx.db
      .query("newsletterRevisions")
      .withIndex("by_campaign_and_createdAt", (q) =>
        q.eq("campaignId", args.campaignId),
      )
      .collect();
    for (const revision of revisions) {
      await ctx.db.delete(revision._id);
    }
    await ctx.db.delete(args.campaignId);
    await audit(ctx, {
      action: "campaign_deleted",
      actorUserId: ctx.adminUser._id,
      campaignId: args.campaignId,
    });
    return null;
  },
});

export const updateAudience = editorMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    divisionIds: v.array(v.id("divisions")),
    favoriteTeamIds: v.array(v.id("teams")),
    confirm: v.boolean(),
  },
  returns: v.object({
    audienceDefinitionId: v.id("newsletterAudienceDefinitions"),
    version: v.number(),
  }),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Nieuwsbrief niet gevonden.");
    }
    if (campaign.status !== "draft") {
      throw new Error("Publiek is alleen bewerkbaar in concept.");
    }
    if (!campaign.audienceDefinitionId) {
      throw new Error("Audience-definitie ontbreekt.");
    }
    const definition = await ctx.db.get(campaign.audienceDefinitionId);
    if (!definition) {
      throw new Error("Audience-definitie ontbreekt.");
    }
    const now = Date.now();
    const version = definition.version + 1;
    const sameDivisions =
      definition.divisionIds.length === args.divisionIds.length &&
      definition.divisionIds.every((id) => args.divisionIds.includes(id));
    const sameTeams =
      definition.favoriteTeamIds.length === args.favoriteTeamIds.length &&
      definition.favoriteTeamIds.every((id) =>
        args.favoriteTeamIds.includes(id),
      );
    const filtersChanged = !sameDivisions || !sameTeams;

    // Confirm sets the lock. Changing filters without confirm clears it.
    // Plain save with unchanged filters preserves an existing confirmation.
    const confirmationPatch = args.confirm
      ? {
          confirmedAt: now,
          confirmedBy: ctx.adminUser._id,
        }
      : filtersChanged
        ? {
            confirmedAt: undefined,
            confirmedBy: undefined,
          }
        : {};

    await ctx.db.patch(definition._id, {
      divisionIds: args.divisionIds,
      favoriteTeamIds: args.favoriteTeamIds,
      updatedAt: now,
      version,
      ...confirmationPatch,
    });
    await audit(ctx, {
      action: "audience_updated",
      actorUserId: ctx.adminUser._id,
      campaignId: args.campaignId,
    });
    return {
      audienceDefinitionId: definition._id,
      version,
    };
  },
});

export const previewAudience = editorQuery({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    now: v.number(),
  },
  returns: audiencePreviewValidator,
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign?.audienceDefinitionId) {
      throw new Error("Nieuwsbrief of publiek niet gevonden.");
    }
    const definition = await ctx.db.get(campaign.audienceDefinitionId);
    if (!definition) {
      throw new Error("Audience-definitie ontbreekt.");
    }
    return await computeAudiencePreview(ctx, definition, args.now);
  },
});

export const listCatalog = viewerQuery({
  args: {},
  returns: v.object({
    divisions: v.array(
      v.object({
        _id: v.id("divisions"),
        label: v.string(),
        provinceKey: v.string(),
      }),
    ),
    teams: v.array(
      v.object({
        _id: v.id("teams"),
        label: v.string(),
        provinceKey: v.string(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const divisions = await ctx.db.query("divisions").take(200);
    const teams = await ctx.db.query("teams").take(200);
    return {
      divisions: divisions
        .filter((d) => d.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((d) => ({
          _id: d._id,
          label: d.label,
          provinceKey: d.provinceKey,
        })),
      teams: teams
        .filter((t) => t.active)
        .map((t) => ({
          _id: t._id,
          label: t.label,
          provinceKey: t.provinceKey,
        })),
    };
  },
});

/** Seed default sender for existing deployments (idempotent). */
export const ensureSenderProfile = internalMutation({
  args: { userId: v.id("users") },
  returns: v.id("emailSenderProfiles"),
  handler: async (ctx, args) => {
    const sender = await ensureDefaultSender(ctx, args.userId);
    return sender._id;
  },
});
