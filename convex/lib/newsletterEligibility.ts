import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
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
  options: { divisionAlreadyMatched?: boolean } = {},
): boolean {
  if (!options.divisionAlreadyMatched && definition.divisionIds.length > 0) {
    const matches = subscriber.divisionIds.some((id) =>
      definition.divisionIds.includes(id),
    );
    if (!matches) {
      return false;
    }
  }
  if (definition.favoriteTeamIds.length > 0) {
    if (
      !subscriber.favoriteTeamId ||
      !definition.favoriteTeamIds.includes(subscriber.favoriteTeamId)
    ) {
      return false;
    }
  }
  return true;
}
