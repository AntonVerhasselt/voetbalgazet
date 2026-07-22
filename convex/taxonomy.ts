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
