import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { editorMutation, viewerQuery } from "./lib/adminAuth";
import { divisionOptions } from "./lib/preferenceCatalog";
import {
  KNOWN_NEON_SERIES,
  labelForDivisionKey,
} from "./lib/neonSeriesMap";
import { ingestIdeaBatch } from "./lib/pipelineIngest";
import { buildFixtureIdeaBatch } from "./lib/pipelineFixtures";
import { validateIdeaBatch } from "./lib/pipelineIdeaBatch";
import { resolvePipelineResearchMode } from "./lib/pipelineMode";
import { assertPhaseTransition, phaseStripBucket } from "./lib/pipelinePhases";
import type { PipelinePhase } from "./lib/pipelineValidators";

async function findActiveRun(
  ctx: QueryCtx | MutationCtx,
  divisionKey: string,
): Promise<Doc<"pipelineResearchRuns"> | null> {
  for (const status of ["queued", "running"] as const) {
    const run = await ctx.db
      .query("pipelineResearchRuns")
      .withIndex("by_division_and_status", (q) =>
        q.eq("divisionKey", divisionKey).eq("status", status),
      )
      .first();
    if (run) return run;
  }
  return null;
}

export const listDivisionsForPipeline = viewerQuery({
  args: {},
  returns: v.array(
    v.object({
      key: v.string(),
      label: v.string(),
      ideaReviewCount: v.number(),
      researchBusy: v.boolean(),
      neonSeriesId: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const placeholderKeys = new Set(divisionOptions.map((d) => d.key));
    const rows: Array<{
      key: string;
      label: string;
      ideaReviewCount: number;
      researchBusy: boolean;
      neonSeriesId: string | null;
    }> = [];

    for (const division of divisionOptions) {
      const ideas = await ctx.db
        .query("pipelineArticles")
        .withIndex("by_division_and_phase", (q) =>
          q.eq("divisionKey", division.key).eq("phase", "idea_review"),
        )
        .collect();
      const neon = KNOWN_NEON_SERIES.find(
        (s) => s.placeholderKey === division.key,
      );
      const busy = (await findActiveRun(ctx, division.key)) !== null;
      rows.push({
        key: division.key,
        label: division.label,
        ideaReviewCount: ideas.length,
        researchBusy: busy,
        neonSeriesId: neon?.neonSeriesId ?? null,
      });
    }

    // Neon-only series without placeholder mapping
    for (const series of KNOWN_NEON_SERIES) {
      if (
        series.placeholderKey &&
        placeholderKeys.has(series.placeholderKey)
      ) {
        continue;
      }
      const ideas = await ctx.db
        .query("pipelineArticles")
        .withIndex("by_division_and_phase", (q) =>
          q.eq("divisionKey", series.neonSeriesId).eq("phase", "idea_review"),
        )
        .collect();
      const busy =
        (await findActiveRun(ctx, series.neonSeriesId)) !== null;
      rows.push({
        key: series.neonSeriesId,
        label: series.neonSeriesName,
        ideaReviewCount: ideas.length,
        researchBusy: busy,
        neonSeriesId: series.neonSeriesId,
      });
    }

    return rows;
  },
});

export const getPhaseCounts = viewerQuery({
  args: { divisionKey: v.string() },
  returns: v.object({
    ideeen: v.number(),
    contacten: v.number(),
    interviews: v.number(),
    drafts: v.number(),
    publicatie: v.number(),
  }),
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("pipelineArticles")
      .withIndex("by_division_and_updatedAt", (q) =>
        q.eq("divisionKey", args.divisionKey),
      )
      .collect();
    const counts = {
      ideeen: 0,
      contacten: 0,
      interviews: 0,
      drafts: 0,
      publicatie: 0,
    };
    for (const article of articles) {
      const bucket = phaseStripBucket(article.phase as PipelinePhase);
      if (bucket) {
        counts[bucket] += 1;
      }
    }
    return counts;
  },
});

/**
 * Active run when research is in flight; otherwise the latest run for this
 * reeks (so failed Eve/fixture errors stay visible in the admin UI).
 */
export const getActiveResearchRun = viewerQuery({
  args: { divisionKey: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("pipelineResearchRuns"),
      status: v.union(
        v.literal("queued"),
        v.literal("running"),
        v.literal("succeeded"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      source: v.union(v.literal("fixture"), v.literal("eve")),
      errorMessage: v.optional(v.string()),
      startedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const active = await findActiveRun(ctx, args.divisionKey);
    if (active) {
      return {
        _id: active._id,
        status: active.status,
        source: active.source,
        errorMessage: active.errorMessage,
        startedAt: active.startedAt,
      };
    }

    const latest = await ctx.db
      .query("pipelineResearchRuns")
      .withIndex("by_division_and_startedAt", (q) =>
        q.eq("divisionKey", args.divisionKey),
      )
      .order("desc")
      .first();
    if (!latest) return null;
    return {
      _id: latest._id,
      status: latest.status,
      source: latest.source,
      errorMessage: latest.errorMessage,
      startedAt: latest.startedAt,
    };
  },
});

export const listIdeas = viewerQuery({
  args: { divisionKey: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("pipelineArticles"),
      ideaTitle: v.string(),
      titleProposals: v.array(v.string()),
      contactsSelected: v.number(),
      contactsTotal: v.number(),
      updatedAt: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("pipelineArticles")
      .withIndex("by_division_and_phase", (q) =>
        q.eq("divisionKey", args.divisionKey).eq("phase", "idea_review"),
      )
      .collect();
    articles.sort((a, b) => b.updatedAt - a.updatedAt);

    const result = [];
    for (const article of articles) {
      const joins = await ctx.db
        .query("pipelineArticleContacts")
        .withIndex("by_article", (q) => q.eq("articleId", article._id))
        .collect();
      result.push({
        _id: article._id,
        ideaTitle: article.ideaTitle,
        titleProposals: article.titleProposals,
        contactsSelected: joins.filter((j) => j.selected).length,
        contactsTotal: joins.length,
        updatedAt: article.updatedAt,
        createdAt: article.createdAt,
      });
    }
    return result;
  },
});

export const getIdeaDetail = viewerQuery({
  args: { articleId: v.id("pipelineArticles") },
  returns: v.union(
    v.object({
      article: v.object({
        _id: v.id("pipelineArticles"),
        divisionKey: v.string(),
        phase: v.string(),
        ideaTitle: v.string(),
        titleProposals: v.array(v.string()),
        whyInteresting: v.string(),
        supportingFacts: v.array(
          v.object({
            claim: v.string(),
            evidence: v.string(),
            source: v.union(v.literal("neon"), v.literal("convex")),
            sqlFingerprint: v.optional(v.string()),
          }),
        ),
        researchSummary: v.optional(v.string()),
        rejectionReason: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
      contacts: v.array(
        v.object({
          articleContactId: v.id("pipelineArticleContacts"),
          contactId: v.id("contacts"),
          fullName: v.string(),
          contactType: v.string(),
          contactTypeDetail: v.optional(v.string()),
          clubName: v.string(),
          teamName: v.optional(v.string()),
          whyInterview: v.string(),
          selected: v.boolean(),
          suggestedOrder: v.number(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return null;
    const joins = await ctx.db
      .query("pipelineArticleContacts")
      .withIndex("by_article", (q) => q.eq("articleId", article._id))
      .collect();
    joins.sort((a, b) => a.suggestedOrder - b.suggestedOrder);

    const contacts = [];
    for (const join of joins) {
      const contact = await ctx.db.get(join.contactId);
      if (!contact) continue;
      contacts.push({
        articleContactId: join._id,
        contactId: contact._id,
        fullName: contact.fullName,
        contactType: contact.contactType,
        contactTypeDetail: contact.contactTypeDetail,
        clubName: contact.clubName,
        teamName: contact.teamName,
        whyInterview: join.whyInterview,
        selected: join.selected,
        suggestedOrder: join.suggestedOrder,
      });
    }

    return {
      article: {
        _id: article._id,
        divisionKey: article.divisionKey,
        phase: article.phase,
        ideaTitle: article.ideaTitle,
        titleProposals: article.titleProposals,
        whyInteresting: article.whyInteresting,
        supportingFacts: article.supportingFacts,
        researchSummary: article.researchSummary,
        rejectionReason: article.rejectionReason,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      },
      contacts,
    };
  },
});

export const startResearchRun = editorMutation({
  args: {
    divisionKey: v.string(),
    clientRequestId: v.string(),
  },
  returns: v.object({
    runId: v.id("pipelineResearchRuns"),
    mode: v.union(v.literal("fixture"), v.literal("eve")),
    reused: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existingByClient = await ctx.db
      .query("pipelineResearchRuns")
      .withIndex("by_clientRequestId", (q) =>
        q.eq("clientRequestId", args.clientRequestId),
      )
      .unique();
    if (existingByClient) {
      return {
        runId: existingByClient._id,
        mode: existingByClient.source,
        reused: true,
      };
    }

    const active = await findActiveRun(ctx, args.divisionKey);
    if (active) {
      throw new Error(
        "Er loopt al research voor deze reeks. Wacht tot die klaar is.",
      );
    }

    const modeResolution = resolvePipelineResearchMode();
    if (modeResolution.error) {
      throw new Error(modeResolution.error);
    }
    const mode = modeResolution.mode;
    const now = Date.now();

    if (mode === "fixture") {
      const runId = await ctx.db.insert("pipelineResearchRuns", {
        divisionKey: args.divisionKey,
        status: "running",
        source: "fixture",
        triggeredBy: ctx.adminUser._id,
        requestedCount: 5,
        startedAt: now,
        clientRequestId: args.clientRequestId,
      });
      await ctx.db.insert("pipelineEvents", {
        researchRunId: runId,
        type: "research_started",
        actorUserId: ctx.adminUser._id,
        metadata: JSON.stringify({ mode: "fixture" }),
        createdAt: now,
      });

      const batch = validateIdeaBatch(buildFixtureIdeaBatch(args.divisionKey));
      const ideaIds = await ingestIdeaBatch(ctx, {
        runId,
        divisionKey: args.divisionKey,
        batch,
        actorUserId: ctx.adminUser._id,
      });
      await ctx.db.patch(runId, {
        status: "succeeded",
        finishedAt: Date.now(),
        ideaIds,
      });
      await ctx.db.insert("pipelineEvents", {
        researchRunId: runId,
        type: "research_succeeded",
        actorUserId: ctx.adminUser._id,
        createdAt: Date.now(),
      });
      return { runId, mode, reused: false };
    }

    const runId = await ctx.db.insert("pipelineResearchRuns", {
      divisionKey: args.divisionKey,
      status: "queued",
      source: "eve",
      triggeredBy: ctx.adminUser._id,
      requestedCount: 5,
      startedAt: now,
      clientRequestId: args.clientRequestId,
    });
    await ctx.db.insert("pipelineEvents", {
      researchRunId: runId,
      type: "research_started",
      actorUserId: ctx.adminUser._id,
      metadata: JSON.stringify({ mode: "eve" }),
      createdAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.pipelineResearchActions.runResearchWaiter,
      { runId },
    );
    return { runId, mode, reused: false };
  },
});

export const approveIdea = editorMutation({
  args: { articleId: v.id("pipelineArticles") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Idee niet gevonden");
    assertPhaseTransition(article.phase as PipelinePhase, "awaiting_contacts");
    const now = Date.now();
    await ctx.db.patch(args.articleId, {
      phase: "awaiting_contacts",
      approvedAt: now,
      approvedBy: ctx.adminUser._id,
      updatedAt: now,
    });
    await ctx.db.insert("pipelineEvents", {
      articleId: args.articleId,
      type: "approved",
      actorUserId: ctx.adminUser._id,
      createdAt: now,
    });
    return null;
  },
});

export const rejectIdea = editorMutation({
  args: {
    articleId: v.id("pipelineArticles"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Idee niet gevonden");
    assertPhaseTransition(article.phase as PipelinePhase, "rejected");
    const now = Date.now();
    await ctx.db.patch(args.articleId, {
      phase: "rejected",
      rejectionReason: args.reason?.trim() || undefined,
      rejectedAt: now,
      rejectedBy: ctx.adminUser._id,
      updatedAt: now,
    });
    await ctx.db.insert("pipelineEvents", {
      articleId: args.articleId,
      type: "rejected",
      actorUserId: ctx.adminUser._id,
      metadata: args.reason ? JSON.stringify({ reason: args.reason }) : undefined,
      createdAt: now,
    });
    return null;
  },
});

export const toggleIntervieweeSelected = editorMutation({
  args: {
    articleContactId: v.id("pipelineArticleContacts"),
    selected: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const join = await ctx.db.get(args.articleContactId);
    if (!join) throw new Error("Interviewkandidaat niet gevonden");
    const article = await ctx.db.get(join.articleId);
    if (!article) throw new Error("Idee niet gevonden");
    if (article.phase !== "idea_review") {
      throw new Error(
        "Interviewkandidaten kunnen alleen in de ideeënfase worden gewijzigd.",
      );
    }
    const now = Date.now();
    await ctx.db.patch(args.articleContactId, {
      selected: args.selected,
      updatedAt: now,
    });
    await ctx.db.insert("pipelineEvents", {
      articleId: article._id,
      type: "interviewees_updated",
      actorUserId: ctx.adminUser._id,
      metadata: JSON.stringify({
        articleContactId: args.articleContactId,
        selected: args.selected,
      }),
      createdAt: now,
    });
    return null;
  },
});

export const completeResearchRun = internalMutation({
  args: {
    runId: v.id("pipelineResearchRuns"),
    batch: v.any(),
    eveSessionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Research run niet gevonden");
    if (run.status !== "running" && run.status !== "queued") {
      throw new Error(`Run is niet actief (status=${run.status})`);
    }

    let batch;
    try {
      batch = validateIdeaBatch(args.batch);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ongeldige IdeaBatch";
      await ctx.db.patch(args.runId, {
        status: "failed",
        finishedAt: Date.now(),
        errorMessage: message,
        eveSessionId: args.eveSessionId,
      });
      await ctx.db.insert("pipelineEvents", {
        researchRunId: args.runId,
        type: "research_failed",
        metadata: JSON.stringify({ error: message }),
        createdAt: Date.now(),
      });
      return null;
    }

    const ideaIds = await ingestIdeaBatch(ctx, {
      runId: args.runId,
      divisionKey: run.divisionKey,
      batch,
      actorUserId: run.triggeredBy,
    });
    await ctx.db.patch(args.runId, {
      status: "succeeded",
      finishedAt: Date.now(),
      ideaIds,
      eveSessionId: args.eveSessionId,
      errorMessage: undefined,
    });
    await ctx.db.insert("pipelineEvents", {
      researchRunId: args.runId,
      type: "research_succeeded",
      actorUserId: run.triggeredBy,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const failResearchRun = internalMutation({
  args: {
    runId: v.id("pipelineResearchRuns"),
    errorMessage: v.string(),
    eveSessionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    if (run.status === "succeeded" || run.status === "failed") {
      return null;
    }
    await ctx.db.patch(args.runId, {
      status: "failed",
      finishedAt: Date.now(),
      errorMessage: args.errorMessage.slice(0, 500),
      eveSessionId: args.eveSessionId,
    });
    await ctx.db.insert("pipelineEvents", {
      researchRunId: args.runId,
      type: "research_failed",
      metadata: JSON.stringify({ error: args.errorMessage.slice(0, 500) }),
      createdAt: Date.now(),
    });
    return null;
  },
});

export const markResearchRunRunning = internalMutation({
  args: {
    runId: v.id("pipelineResearchRuns"),
    eveSessionId: v.optional(v.string()),
  },
  returns: v.object({
    divisionKey: v.string(),
    divisionLabel: v.string(),
  }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Research run niet gevonden");
    if (run.status !== "queued" && run.status !== "running") {
      throw new Error(`Run kan niet starten (status=${run.status})`);
    }
    await ctx.db.patch(args.runId, {
      status: "running",
      eveSessionId: args.eveSessionId,
    });
    return {
      divisionKey: run.divisionKey,
      divisionLabel: labelForDivisionKey(run.divisionKey),
    };
  },
});

// Keep Id import used for type docs in generated code consumers
export type PipelineArticleId = Id<"pipelineArticles">;
