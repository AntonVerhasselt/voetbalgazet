import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { adminMutation } from "./lib/adminAuth";
import {
  divisionOptions,
  teamOptions,
} from "./lib/preferenceCatalog";

async function ensureDivisionFromCatalog(
  ctx: MutationCtx,
  key: string,
): Promise<{ id: Id<"divisions">; created: boolean; updated: boolean }> {
  const option = divisionOptions.find((division) => division.key === key);
  if (!option) {
    throw new Error(`Onbekende reeks: ${key}`);
  }
  const existing = await ctx.db
    .query("divisions")
    .withIndex("by_external_key", (q) => q.eq("externalKey", key))
    .unique();
  if (existing) {
    const needsUpdate =
      existing.label !== option.label ||
      existing.provinceKey !== option.provinceKey ||
      existing.level !== option.level ||
      existing.sortOrder !== option.sortOrder ||
      !existing.active;
    if (needsUpdate) {
      await ctx.db.patch(existing._id, {
        label: option.label,
        provinceKey: option.provinceKey,
        level: option.level,
        sortOrder: option.sortOrder,
        active: true,
      });
    }
    return { id: existing._id, created: false, updated: needsUpdate };
  }
  const id = await ctx.db.insert("divisions", {
    externalKey: option.key,
    label: option.label,
    provinceKey: option.provinceKey,
    level: option.level,
    active: true,
    sortOrder: option.sortOrder,
  });
  return { id, created: true, updated: false };
}

async function ensureTeamFromCatalog(
  ctx: MutationCtx,
  key: string,
  divisionIdByKey: Map<string, Id<"divisions">>,
): Promise<{ created: boolean; updated: boolean }> {
  const option = teamOptions.find((team) => team.key === key);
  if (!option) {
    throw new Error(`Onbekende club: ${key}`);
  }
  const teamDivisionIds: Id<"divisions">[] = [];
  for (const divisionKey of option.divisionKeys) {
    const divisionId = divisionIdByKey.get(divisionKey);
    if (!divisionId) {
      throw new Error(
        `Club ${key} verwijst naar ontbrekende reeks ${divisionKey}`,
      );
    }
    teamDivisionIds.push(divisionId);
  }
  const existing = await ctx.db
    .query("teams")
    .withIndex("by_external_key", (q) => q.eq("externalKey", key))
    .unique();
  if (existing) {
    const sameDivisions =
      existing.divisionIds.length === teamDivisionIds.length &&
      existing.divisionIds.every((id, index) => id === teamDivisionIds[index]);
    const needsUpdate =
      existing.label !== option.label ||
      existing.provinceKey !== option.provinceKey ||
      !sameDivisions ||
      !existing.active;
    if (needsUpdate) {
      await ctx.db.patch(existing._id, {
        label: option.label,
        provinceKey: option.provinceKey,
        divisionIds: teamDivisionIds,
        active: true,
      });
    }
    return { created: false, updated: needsUpdate };
  }
  await ctx.db.insert("teams", {
    externalKey: option.key,
    label: option.label,
    provinceKey: option.provinceKey,
    divisionIds: teamDivisionIds,
    active: true,
  });
  return { created: true, updated: false };
}

async function runTaxonomySync(ctx: MutationCtx): Promise<{
  divisionsCreated: number;
  divisionsUpdated: number;
  divisionsDeactivated: number;
  teamsCreated: number;
  teamsUpdated: number;
  teamsDeactivated: number;
}> {
  let divisionsCreated = 0;
  let divisionsUpdated = 0;
  let divisionsDeactivated = 0;
  let teamsCreated = 0;
  let teamsUpdated = 0;
  let teamsDeactivated = 0;
  const divisionIdByKey = new Map<string, Id<"divisions">>();
  const catalogDivisionKeys = new Set<string>(divisionOptions.map((d) => d.key));
  const catalogTeamKeys = new Set<string>(teamOptions.map((t) => t.key));

  for (const option of divisionOptions) {
    const result = await ensureDivisionFromCatalog(ctx, option.key);
    divisionIdByKey.set(option.key, result.id);
    if (result.created) {
      divisionsCreated += 1;
    }
    if (result.updated) {
      divisionsUpdated += 1;
    }
  }

  for (const option of teamOptions) {
    const result = await ensureTeamFromCatalog(
      ctx,
      option.key,
      divisionIdByKey,
    );
    if (result.created) {
      teamsCreated += 1;
    }
    if (result.updated) {
      teamsUpdated += 1;
    }
  }

  // Divisions/teams are small bounded catalogs — collect is safe and avoids
  // Convex's single-paginated-query-per-function limit.
  const allDivisions = await ctx.db.query("divisions").collect();
  for (const row of allDivisions) {
    if (row.active && !catalogDivisionKeys.has(row.externalKey)) {
      await ctx.db.patch(row._id, { active: false });
      divisionsDeactivated += 1;
    }
  }

  const allTeams = await ctx.db.query("teams").collect();
  for (const row of allTeams) {
    if (row.active && !catalogTeamKeys.has(row.externalKey)) {
      await ctx.db.patch(row._id, { active: false });
      teamsDeactivated += 1;
    }
  }

  return {
    divisionsCreated,
    divisionsUpdated,
    divisionsDeactivated,
    teamsCreated,
    teamsUpdated,
    teamsDeactivated,
  };
}

async function previewTaxonomySyncData(ctx: MutationCtx | QueryCtx) {
  let divisionsToCreate = 0;
  let divisionsToUpdate = 0;
  let divisionsToDeactivate = 0;
  let teamsToCreate = 0;
  let teamsToUpdate = 0;
  let teamsToDeactivate = 0;
  const catalogDivisionKeys = new Set<string>(divisionOptions.map((d) => d.key));
  const catalogTeamKeys = new Set<string>(teamOptions.map((t) => t.key));

  for (const option of divisionOptions) {
    const existing = await ctx.db
      .query("divisions")
      .withIndex("by_external_key", (q) => q.eq("externalKey", option.key))
      .unique();
    if (!existing) {
      divisionsToCreate += 1;
      continue;
    }
    if (
      existing.label !== option.label ||
      existing.provinceKey !== option.provinceKey ||
      existing.level !== option.level ||
      existing.sortOrder !== option.sortOrder ||
      !existing.active
    ) {
      divisionsToUpdate += 1;
    }
  }

  for (const option of teamOptions) {
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_external_key", (q) => q.eq("externalKey", option.key))
      .unique();
    if (!existing) {
      teamsToCreate += 1;
      continue;
    }
    const expectedDivisionIds: Id<"divisions">[] = [];
    for (const divisionKey of option.divisionKeys) {
      const division = await ctx.db
        .query("divisions")
        .withIndex("by_external_key", (q) => q.eq("externalKey", divisionKey))
        .unique();
      if (division) expectedDivisionIds.push(division._id);
    }
    const sameDivisions =
      existing.divisionIds.length === expectedDivisionIds.length &&
      existing.divisionIds.every((id, index) => id === expectedDivisionIds[index]);
    if (
      existing.label !== option.label ||
      existing.provinceKey !== option.provinceKey ||
      !sameDivisions ||
      !existing.active
    ) {
      teamsToUpdate += 1;
    }
  }

  const allDivisions = await ctx.db.query("divisions").collect();
  for (const row of allDivisions) {
    if (row.active && !catalogDivisionKeys.has(row.externalKey)) {
      divisionsToDeactivate += 1;
    }
  }

  const allTeams = await ctx.db.query("teams").collect();
  for (const row of allTeams) {
    if (row.active && !catalogTeamKeys.has(row.externalKey)) {
      teamsToDeactivate += 1;
    }
  }

  return {
    divisionsToCreate,
    divisionsToUpdate,
    divisionsToDeactivate,
    teamsToCreate,
    teamsToUpdate,
    teamsToDeactivate,
    catalogDivisionCount: divisionOptions.length,
    catalogTeamCount: teamOptions.length,
  };
}

/** Preview catalog → Convex taxonomy sync without writes. */
export const previewTaxonomySync = adminMutation({
  args: {},
  returns: v.object({
    divisionsToCreate: v.number(),
    divisionsToUpdate: v.number(),
    divisionsToDeactivate: v.number(),
    teamsToCreate: v.number(),
    teamsToUpdate: v.number(),
    teamsToDeactivate: v.number(),
    catalogDivisionCount: v.number(),
    catalogTeamCount: v.number(),
  }),
  handler: async (ctx) => {
    return await previewTaxonomySyncData(ctx);
  },
});

export const previewTaxonomySyncInternal = internalMutation({
  args: {},
  returns: v.object({
    divisionsToCreate: v.number(),
    divisionsToUpdate: v.number(),
    divisionsToDeactivate: v.number(),
    teamsToCreate: v.number(),
    teamsToUpdate: v.number(),
    teamsToDeactivate: v.number(),
    catalogDivisionCount: v.number(),
    catalogTeamCount: v.number(),
  }),
  handler: async (ctx) => {
    return await previewTaxonomySyncData(ctx);
  },
});

export const syncTaxonomyFromCatalog = adminMutation({
  args: {},
  returns: v.object({
    divisionsCreated: v.number(),
    divisionsUpdated: v.number(),
    divisionsDeactivated: v.number(),
    teamsCreated: v.number(),
    teamsUpdated: v.number(),
    teamsDeactivated: v.number(),
  }),
  handler: async (ctx) => {
    const result = await runTaxonomySync(ctx);
    await ctx.db.insert("newsletterAuditEvents", {
      action: "taxonomy_synced",
      actorUserId: ctx.adminUser._id,
      metadata: JSON.stringify(result),
      createdAt: Date.now(),
    });
    return result;
  },
});

export const syncTaxonomyInternal = internalMutation({
  args: {},
  returns: v.object({
    divisionsCreated: v.number(),
    divisionsUpdated: v.number(),
    divisionsDeactivated: v.number(),
    teamsCreated: v.number(),
    teamsUpdated: v.number(),
    teamsDeactivated: v.number(),
  }),
  handler: async (ctx) => {
    return await runTaxonomySync(ctx);
  },
});

/**
 * In-place remap of division externalKeys (and pipeline string keys) to Neon
 * series.id values. Must run BEFORE catalog sync after keys change, so
 * subscribers keep their divisionIds on the same rows.
 */
export const remapDivisionKeysToNeonInternal = internalMutation({
  args: {
    remaps: v.array(
      v.object({
        from: v.string(),
        to: v.string(),
        label: v.optional(v.string()),
      }),
    ),
  },
  returns: v.object({
    divisionsRemapped: v.number(),
    divisionsAlreadyDone: v.number(),
    divisionsMissing: v.number(),
    conflicts: v.array(v.string()),
    pipelineRunsRemapped: v.number(),
    pipelineArticlesRemapped: v.number(),
    contactsRemapped: v.number(),
  }),
  handler: async (ctx, args) => {
    let divisionsRemapped = 0;
    let divisionsAlreadyDone = 0;
    let divisionsMissing = 0;
    const conflicts: string[] = [];
    let pipelineRunsRemapped = 0;
    let pipelineArticlesRemapped = 0;
    let contactsRemapped = 0;

    for (const remap of args.remaps) {
      if (remap.from === remap.to) continue;

      const fromRow = await ctx.db
        .query("divisions")
        .withIndex("by_external_key", (q) => q.eq("externalKey", remap.from))
        .unique();
      const toRow = await ctx.db
        .query("divisions")
        .withIndex("by_external_key", (q) => q.eq("externalKey", remap.to))
        .unique();

      if (fromRow && toRow) {
        conflicts.push(
          `${remap.from} and ${remap.to} both exist (ids ${fromRow._id}, ${toRow._id}) — merge manually`,
        );
      } else if (fromRow && !toRow) {
        await ctx.db.patch(fromRow._id, {
          externalKey: remap.to,
          ...(remap.label ? { label: remap.label } : {}),
          active: true,
        });
        divisionsRemapped += 1;
      } else if (!fromRow && toRow) {
        divisionsAlreadyDone += 1;
      } else {
        divisionsMissing += 1;
      }

      const runs = await ctx.db
        .query("pipelineResearchRuns")
        .withIndex("by_division_and_startedAt", (q) =>
          q.eq("divisionKey", remap.from),
        )
        .collect();
      for (const run of runs) {
        await ctx.db.patch(run._id, { divisionKey: remap.to });
        pipelineRunsRemapped += 1;
      }

      const articles = await ctx.db
        .query("pipelineArticles")
        .withIndex("by_division_and_updatedAt", (q) =>
          q.eq("divisionKey", remap.from),
        )
        .collect();
      for (const article of articles) {
        await ctx.db.patch(article._id, { divisionKey: remap.to });
        pipelineArticlesRemapped += 1;
      }
    }

    const remapMap = new Map(args.remaps.map((r) => [r.from, r.to]));
    const contacts = await ctx.db.query("contacts").collect();
    for (const contact of contacts) {
      let changed = false;
      const nextKeys: string[] = [];
      const seen = new Set<string>();
      for (const key of contact.divisionKeys) {
        const mapped = remapMap.get(key) ?? key;
        if (mapped !== key) changed = true;
        if (!seen.has(mapped)) {
          seen.add(mapped);
          nextKeys.push(mapped);
        } else if (mapped !== key) {
          changed = true;
        }
      }
      if (changed) {
        await ctx.db.patch(contact._id, {
          divisionKeys: nextKeys,
          updatedAt: Date.now(),
        });
        contactsRemapped += 1;
      }
    }

    if (conflicts.length > 0) {
      throw new Error(
        `Taxonomy remap conflicts: ${conflicts.join("; ")}`,
      );
    }

    return {
      divisionsRemapped,
      divisionsAlreadyDone,
      divisionsMissing,
      conflicts,
      pipelineRunsRemapped,
      pipelineArticlesRemapped,
      contactsRemapped,
    };
  },
});

/**
 * Hard-delete inactive divisions/teams that are no longer in the catalog,
 * after scrubbing subscriber / audience / contact / pipeline references.
 *
 * Dry-run (default): report what would be removed.
 * Execute: CONFIRM_TAXONOMY_PURGE=1 via CLI script, or pass execute:true.
 */
export const purgeInactiveTaxonomyInternal = internalMutation({
  args: {
    execute: v.boolean(),
  },
  returns: v.object({
    execute: v.boolean(),
    inactiveDivisions: v.array(
      v.object({
        id: v.id("divisions"),
        externalKey: v.string(),
        label: v.string(),
      }),
    ),
    inactiveTeams: v.array(
      v.object({
        id: v.id("teams"),
        externalKey: v.string(),
        label: v.string(),
      }),
    ),
    subscribersScrubbed: v.number(),
    preferenceRowsDeleted: v.number(),
    audienceDefsScrubbed: v.number(),
    activeTeamsDivisionIdsScrubbed: v.number(),
    contactsScrubbed: v.number(),
    pipelineRunsScrubbed: v.number(),
    pipelineArticlesScrubbed: v.number(),
    divisionsDeleted: v.number(),
    teamsDeleted: v.number(),
  }),
  handler: async (ctx, args) => {
    const catalogDivisionKeys: ReadonlySet<string> = new Set(
      divisionOptions.map((d) => d.key),
    );
    const catalogTeamKeys: ReadonlySet<string> = new Set(
      teamOptions.map((t) => t.key),
    );

    const allDivisions = await ctx.db.query("divisions").collect();
    const allTeams = await ctx.db.query("teams").collect();

    // Inactive OR orphaned (active but no longer in catalog — should not happen
    // after sync, but include for safety).
    const doomedDivisions = allDivisions.filter(
      (row) => !row.active || !catalogDivisionKeys.has(row.externalKey),
    );
    const doomedTeams = allTeams.filter(
      (row) => !row.active || !catalogTeamKeys.has(row.externalKey),
    );

    const doomedDivisionIds = new Set(doomedDivisions.map((d) => d._id));
    const doomedTeamIds = new Set(doomedTeams.map((t) => t._id));
    const doomedDivisionKeys = new Set(
      doomedDivisions.map((d) => d.externalKey),
    );

    const inactiveDivisions = doomedDivisions.map((d) => ({
      id: d._id,
      externalKey: d.externalKey,
      label: d.label,
    }));
    const inactiveTeams = doomedTeams.map((t) => ({
      id: t._id,
      externalKey: t.externalKey,
      label: t.label,
    }));

    let subscribersScrubbed = 0;
    let preferenceRowsDeleted = 0;
    let audienceDefsScrubbed = 0;
    let activeTeamsDivisionIdsScrubbed = 0;
    let contactsScrubbed = 0;
    let pipelineRunsScrubbed = 0;
    let pipelineArticlesScrubbed = 0;
    let divisionsDeleted = 0;
    let teamsDeleted = 0;

    if (!args.execute) {
      // Estimate subscriber impact without writes
      const subscribers = await ctx.db.query("subscribers").collect();
      for (const subscriber of subscribers) {
        const hasDoomedDivision = subscriber.divisionIds.some((id) =>
          doomedDivisionIds.has(id),
        );
        const hasDoomedTeam =
          subscriber.favoriteTeamId !== undefined &&
          doomedTeamIds.has(subscriber.favoriteTeamId);
        if (hasDoomedDivision || hasDoomedTeam) {
          subscribersScrubbed += 1;
        }
      }
      const prefs = await ctx.db
        .query("subscriberDivisionPreferences")
        .collect();
      for (const pref of prefs) {
        if (doomedDivisionIds.has(pref.divisionId)) {
          preferenceRowsDeleted += 1;
        }
      }
      return {
        execute: false,
        inactiveDivisions,
        inactiveTeams,
        subscribersScrubbed,
        preferenceRowsDeleted,
        audienceDefsScrubbed: 0,
        activeTeamsDivisionIdsScrubbed: 0,
        contactsScrubbed: 0,
        pipelineRunsScrubbed: 0,
        pipelineArticlesScrubbed: 0,
        divisionsDeleted: 0,
        teamsDeleted: 0,
      };
    }

    // 1) Scrub subscribers
    const subscribers = await ctx.db.query("subscribers").collect();
    for (const subscriber of subscribers) {
      const nextDivisionIds = subscriber.divisionIds.filter(
        (id) => !doomedDivisionIds.has(id),
      );
      const clearFavorite =
        subscriber.favoriteTeamId !== undefined &&
        doomedTeamIds.has(subscriber.favoriteTeamId);
      const divisionsChanged =
        nextDivisionIds.length !== subscriber.divisionIds.length;
      if (divisionsChanged || clearFavorite) {
        await ctx.db.patch(subscriber._id, {
          divisionIds: nextDivisionIds,
          ...(clearFavorite ? { favoriteTeamId: undefined } : {}),
        });
        subscribersScrubbed += 1;
      }
    }

    // 2) Delete preference projection rows
    const prefs = await ctx.db
      .query("subscriberDivisionPreferences")
      .collect();
    for (const pref of prefs) {
      if (doomedDivisionIds.has(pref.divisionId)) {
        await ctx.db.delete(pref._id);
        preferenceRowsDeleted += 1;
      }
    }

    // 3) Scrub newsletter audience definitions
    const audiences = await ctx.db
      .query("newsletterAudienceDefinitions")
      .collect();
    for (const audience of audiences) {
      const nextDivisionIds = audience.divisionIds.filter(
        (id) => !doomedDivisionIds.has(id),
      );
      const nextTeamIds = audience.favoriteTeamIds.filter(
        (id) => !doomedTeamIds.has(id),
      );
      let ruleGroupsChanged = false;
      const nextRuleGroups = audience.ruleGroups?.map((group) => {
        const nextConditions = group.conditions.map((condition) => {
          if (condition.field === "division") {
            const filtered = condition.divisionIds.filter(
              (id) => !doomedDivisionIds.has(id),
            );
            if (filtered.length !== condition.divisionIds.length) {
              ruleGroupsChanged = true;
              return { ...condition, divisionIds: filtered };
            }
          }
          if (condition.field === "favorite_team") {
            const filtered = condition.teamIds.filter(
              (id) => !doomedTeamIds.has(id),
            );
            if (filtered.length !== condition.teamIds.length) {
              ruleGroupsChanged = true;
              return { ...condition, teamIds: filtered };
            }
          }
          return condition;
        });
        return { ...group, conditions: nextConditions };
      });
      const legacyChanged =
        nextDivisionIds.length !== audience.divisionIds.length ||
        nextTeamIds.length !== audience.favoriteTeamIds.length;
      if (legacyChanged || ruleGroupsChanged) {
        await ctx.db.patch(audience._id, {
          divisionIds: nextDivisionIds,
          favoriteTeamIds: nextTeamIds,
          ...(nextRuleGroups ? { ruleGroups: nextRuleGroups } : {}),
          updatedAt: Date.now(),
        });
        audienceDefsScrubbed += 1;
      }
    }

    // 4) Strip doomed division ids from active teams that remain
    for (const team of allTeams) {
      if (doomedTeamIds.has(team._id)) continue;
      const nextDivisionIds = team.divisionIds.filter(
        (id) => !doomedDivisionIds.has(id),
      );
      if (nextDivisionIds.length !== team.divisionIds.length) {
        await ctx.db.patch(team._id, { divisionIds: nextDivisionIds });
        activeTeamsDivisionIdsScrubbed += 1;
      }
    }

    // 5) Scrub contacts.divisionKeys (string public keys)
    const contacts = await ctx.db.query("contacts").collect();
    for (const contact of contacts) {
      const nextKeys = contact.divisionKeys.filter(
        (key) => !doomedDivisionKeys.has(key),
      );
      if (nextKeys.length !== contact.divisionKeys.length) {
        await ctx.db.patch(contact._id, {
          divisionKeys: nextKeys,
          updatedAt: Date.now(),
        });
        contactsScrubbed += 1;
      }
    }

    // 6) Pipeline runs / articles keyed by doomed public keys — clear to ""
    //    is not allowed; leave them but count for the report. Prefer remap
    //    only when a destination exists; otherwise leave orphan strings
    //    (no FK). We only scrub when the key is a doomed catalog key.
    for (const division of doomedDivisions) {
      const runs = await ctx.db
        .query("pipelineResearchRuns")
        .withIndex("by_division_and_startedAt", (q) =>
          q.eq("divisionKey", division.externalKey),
        )
        .collect();
      pipelineRunsScrubbed += runs.length;
      // Do not delete pipeline history — leave orphan string keys.

      const articles = await ctx.db
        .query("pipelineArticles")
        .withIndex("by_division_and_updatedAt", (q) =>
          q.eq("divisionKey", division.externalKey),
        )
        .collect();
      pipelineArticlesScrubbed += articles.length;
    }

    // 7) Hard-delete doomed teams then divisions
    for (const team of doomedTeams) {
      await ctx.db.delete(team._id);
      teamsDeleted += 1;
    }
    for (const division of doomedDivisions) {
      await ctx.db.delete(division._id);
      divisionsDeleted += 1;
    }

    await ctx.db.insert("newsletterAuditEvents", {
      action: "taxonomy_purged",
      metadata: JSON.stringify({
        divisionsDeleted,
        teamsDeleted,
        subscribersScrubbed,
        preferenceRowsDeleted,
        audienceDefsScrubbed,
        contactsScrubbed,
        inactiveDivisionKeys: inactiveDivisions.map((d) => d.externalKey),
        inactiveTeamKeys: inactiveTeams.map((t) => t.externalKey),
      }),
      createdAt: Date.now(),
    });

    return {
      execute: true,
      inactiveDivisions,
      inactiveTeams,
      subscribersScrubbed,
      preferenceRowsDeleted,
      audienceDefsScrubbed,
      activeTeamsDivisionIdsScrubbed,
      contactsScrubbed,
      pipelineRunsScrubbed,
      pipelineArticlesScrubbed,
      divisionsDeleted,
      teamsDeleted,
    };
  },
});
