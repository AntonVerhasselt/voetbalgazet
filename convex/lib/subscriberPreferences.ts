import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";
import {
  divisionKeys,
  divisionOptions,
  teamKeys,
  teamOptions,
} from "./preferenceCatalog";

const MAX_DIVISIONS = 10;

export function validatePreferenceKeys(
  requestedDivisionKeys: readonly string[],
  requestedTeamKey: string | undefined,
): { divisionKeys: string[]; teamKey: string | undefined } {
  const uniqueDivisionKeys = [...new Set(requestedDivisionKeys)];
  if (uniqueDivisionKeys.length === 0) {
    throw new Error("Kies minstens één reeks.");
  }
  if (uniqueDivisionKeys.length > MAX_DIVISIONS) {
    throw new Error(`Kies maximaal ${MAX_DIVISIONS} reeksen.`);
  }
  for (const key of uniqueDivisionKeys) {
    if (!divisionKeys.has(key)) {
      throw new Error("Een gekozen reeks is niet beschikbaar.");
    }
  }
  if (requestedTeamKey && !teamKeys.has(requestedTeamKey)) {
    throw new Error("De gekozen club is niet beschikbaar.");
  }

  if (requestedTeamKey) {
    const team = teamOptions.find((option) => option.key === requestedTeamKey);
    if (
      !team ||
      !team.divisionKeys.some((key) => uniqueDivisionKeys.includes(key))
    ) {
      throw new Error("Kies een reeks waarin je favoriete club actief is.");
    }
  }

  return {
    divisionKeys: uniqueDivisionKeys,
    teamKey: requestedTeamKey,
  };
}

async function ensureDivision(
  ctx: MutationCtx,
  key: string,
): Promise<Id<"divisions">> {
  const option = divisionOptions.find((division) => division.key === key);
  if (!option) {
    throw new Error("Een gekozen reeks is niet beschikbaar.");
  }

  const existing = await ctx.db
    .query("divisions")
    .withIndex("by_external_key", (query) => query.eq("externalKey", key))
    .unique();
  if (existing) {
    if (
      existing.label !== option.label ||
      existing.provinceKey !== option.provinceKey ||
      existing.level !== option.level ||
      existing.sortOrder !== option.sortOrder ||
      !existing.active
    ) {
      await ctx.db.patch("divisions", existing._id, {
        label: option.label,
        provinceKey: option.provinceKey,
        level: option.level,
        sortOrder: option.sortOrder,
        active: true,
      });
    }
    return existing._id;
  }

  return await ctx.db.insert("divisions", {
    externalKey: option.key,
    label: option.label,
    provinceKey: option.provinceKey,
    level: option.level,
    active: true,
    sortOrder: option.sortOrder,
  });
}

async function ensureTeam(
  ctx: MutationCtx,
  key: string,
): Promise<Id<"teams">> {
  const option = teamOptions.find((team) => team.key === key);
  if (!option) {
    throw new Error("De gekozen club is niet beschikbaar.");
  }
  const teamDivisionIds: Id<"divisions">[] = [];
  for (const divisionKey of option.divisionKeys) {
    teamDivisionIds.push(await ensureDivision(ctx, divisionKey));
  }

  const existing = await ctx.db
    .query("teams")
    .withIndex("by_external_key", (query) => query.eq("externalKey", key))
    .unique();
  if (existing) {
    await ctx.db.patch("teams", existing._id, {
      label: option.label,
      provinceKey: option.provinceKey,
      divisionIds: teamDivisionIds,
      active: true,
    });
    return existing._id;
  }

  return await ctx.db.insert("teams", {
    externalKey: option.key,
    label: option.label,
    provinceKey: option.provinceKey,
    divisionIds: teamDivisionIds,
    active: true,
  });
}

export async function applySubscriberPreferences(
  ctx: MutationCtx,
  subscriberId: Id<"subscribers">,
  requestedDivisionKeys: readonly string[],
  requestedTeamKey: string | undefined,
): Promise<void> {
  const validated = validatePreferenceKeys(
    requestedDivisionKeys,
    requestedTeamKey,
  );
  const divisionIds: Id<"divisions">[] = [];
  for (const key of validated.divisionKeys) {
    divisionIds.push(await ensureDivision(ctx, key));
  }
  const favoriteTeamId = validated.teamKey
    ? await ensureTeam(ctx, validated.teamKey)
    : undefined;

  const existingProjection = await ctx.db
    .query("subscriberDivisionPreferences")
    .withIndex("by_subscriber", (query) =>
      query.eq("subscriberId", subscriberId),
    )
    .collect();
  for (const projection of existingProjection) {
    await ctx.db.delete("subscriberDivisionPreferences", projection._id);
  }
  for (const divisionId of divisionIds) {
    await ctx.db.insert("subscriberDivisionPreferences", {
      subscriberId,
      divisionId,
    });
  }

  await ctx.db.patch("subscribers", subscriberId, {
    divisionIds,
    ...(favoriteTeamId ? { favoriteTeamId } : { favoriteTeamId: undefined }),
    preferenceStatus: "complete",
  });
}

export async function getVerifiedSubscriber(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"subscribers">> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser || authUser.isAnonymous || !authUser.emailVerified) {
    throw new Error("Open eerst de veilige link in je mailbox.");
  }

  const normalizedEmail = authUser.email.normalize("NFKC").trim().toLowerCase();
  const subscriber = await ctx.db
    .query("subscribers")
    .withIndex("by_normalized_email", (query) =>
      query.eq("normalizedEmail", normalizedEmail),
    )
    .unique();
  if (!subscriber || !subscriber.siteAccess) {
    throw new Error("Geen actief lezersabonnement gevonden.");
  }
  return subscriber;
}

export async function preferenceKeysForSubscriber(
  ctx: QueryCtx | MutationCtx,
  subscriber: Doc<"subscribers">,
): Promise<{ divisionKeys: string[]; teamKey: string | null }> {
  const selectedDivisionKeys: string[] = [];
  for (const divisionId of subscriber.divisionIds) {
    const division = await ctx.db.get("divisions", divisionId);
    if (division) {
      selectedDivisionKeys.push(division.externalKey);
    }
  }
  const team = subscriber.favoriteTeamId
    ? await ctx.db.get("teams", subscriber.favoriteTeamId)
    : null;

  return {
    divisionKeys: selectedDivisionKeys,
    teamKey: team?.externalKey ?? null,
  };
}
