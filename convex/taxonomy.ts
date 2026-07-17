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
  teamsCreated: number;
  teamsUpdated: number;
}> {
  let divisionsCreated = 0;
  let divisionsUpdated = 0;
  let teamsCreated = 0;
  let teamsUpdated = 0;
  const divisionIdByKey = new Map<string, Id<"divisions">>();

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

  return {
    divisionsCreated,
    divisionsUpdated,
    teamsCreated,
    teamsUpdated,
  };
}

async function previewTaxonomySyncData(ctx: MutationCtx | QueryCtx) {
  let divisionsToCreate = 0;
  let divisionsToUpdate = 0;
  let teamsToCreate = 0;
  let teamsToUpdate = 0;

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
    if (
      existing.label !== option.label ||
      existing.provinceKey !== option.provinceKey ||
      !existing.active
    ) {
      teamsToUpdate += 1;
    }
  }

  return {
    divisionsToCreate,
    divisionsToUpdate,
    teamsToCreate,
    teamsToUpdate,
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
    teamsToCreate: v.number(),
    teamsToUpdate: v.number(),
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
    teamsToCreate: v.number(),
    teamsToUpdate: v.number(),
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
    teamsCreated: v.number(),
    teamsUpdated: v.number(),
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
    teamsCreated: v.number(),
    teamsUpdated: v.number(),
  }),
  handler: async (ctx) => {
    return await runTaxonomySync(ctx);
  },
});
