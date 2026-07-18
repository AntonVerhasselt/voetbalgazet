import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  resolveRuleGroups,
  subscriberMatchesRuleGroups,
  type DivisionMeta,
} from "./audienceRules";
import type { AudienceEngagementContext } from "./audienceEngagement";
import { hasActiveSuppression } from "./suppressions";

export type EligibilityCursor =
  | {
      mode: "subscribed";
      cursor: string | null;
    }
  | {
      mode: "division";
      index: number;
      cursor: string | null;
    }
  | {
      mode: "team";
      index: number;
      cursor: string | null;
    };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function decodeEligibilityCursor(
  value: string | null,
): EligibilityCursor | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed) || typeof parsed.mode !== "string") {
      return { mode: "subscribed", cursor: value };
    }
    const cursor =
      typeof parsed.cursor === "string" || parsed.cursor === null
        ? parsed.cursor
        : null;
    if (parsed.mode === "subscribed") {
      return { mode: "subscribed", cursor };
    }
    if (
      (parsed.mode === "division" || parsed.mode === "team") &&
      typeof parsed.index === "number" &&
      Number.isInteger(parsed.index) &&
      parsed.index >= 0
    ) {
      return { mode: parsed.mode, index: parsed.index, cursor };
    }
  } catch {
    return { mode: "subscribed", cursor: value };
  }
  return { mode: "subscribed", cursor: value };
}

export function encodeEligibilityCursor(cursor: EligibilityCursor): string {
  return JSON.stringify(cursor);
}

export async function subscriberCanReceiveNewsletter(
  ctx: QueryCtx,
  subscriber: Doc<"subscribers">,
): Promise<boolean> {
  if (!subscriber.newsletterSubscribed || subscriber.unsubscribedAt !== undefined) {
    return false;
  }
  if (
    await hasActiveSuppression(ctx, {
      subscriberId: subscriber._id,
      normalizedEmail: subscriber.normalizedEmail,
    })
  ) {
    return false;
  }
  return true;
}

export function subscriberMatchesAudienceFilters(
  subscriber: Doc<"subscribers">,
  definition: Doc<"newsletterAudienceDefinitions">,
  divisionMetaById: Map<string, DivisionMeta>,
  now: number,
  engagement: AudienceEngagementContext,
  options: { divisionAlreadyMatched?: boolean } = {},
): boolean {
  const ruleGroups = resolveRuleGroups(definition);
  if (ruleGroups.length === 0) {
    return true;
  }
  const snapshot = {
    _id: subscriber._id,
    divisionIds: subscriber.divisionIds,
    favoriteTeamId: subscriber.favoriteTeamId,
    newsletterSubscribedAt: subscriber.newsletterSubscribedAt,
    lastEmailDeliveredAt: subscriber.lastEmailDeliveredAt,
    lastEmailOpenedAt: subscriber.lastEmailOpenedAt,
    lastEmailClickedAt: subscriber.lastEmailClickedAt,
  };
  // When candidates came from a division index on a simple legacy rule,
  // skip re-checking division-only conditions that are already satisfied.
  if (options.divisionAlreadyMatched) {
    const withoutDivision = ruleGroups.map((group) => ({
      ...group,
      conditions: group.conditions.filter(
        (condition) => condition.field !== "division",
      ),
    }));
    // If every group only had division conditions, membership already matches.
    if (withoutDivision.every((group) => group.conditions.length === 0)) {
      return true;
    }
    return subscriberMatchesRuleGroups(
      snapshot,
      withoutDivision.filter((group) => group.conditions.length > 0),
      divisionMetaById,
      now,
      engagement,
    );
  }
  return subscriberMatchesRuleGroups(
    snapshot,
    ruleGroups,
    divisionMetaById,
    now,
    engagement,
  );
}
