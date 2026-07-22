/**
 * Readable public division keys ↔ Neon series.id mapping.
 *
 * Rules:
 * - User-facing keys (signup, YAML, Keystatic, pipeline UI, Convex
 *   `divisions.externalKey`, pipeline `divisionKey`) are ALWAYS readable
 *   kebab-case (e.g. `antwerpen-p1`). Never expose Neon ids to users.
 * - Neon `series.id` (e.g. `CHP_130005`) is for SQL / agent research only.
 *
 * Source: `generated/neonTaxonomyData.ts` (from Neon import).
 */

import { generatedNeonSeries } from "./generated/neonTaxonomyData";

export type NeonSeriesRef = {
  neonSeriesId: string;
  neonSeriesName: string;
  /** Readable public key used everywhere in the product UI / catalog. */
  publicKey: string;
};

export const KNOWN_NEON_SERIES: readonly NeonSeriesRef[] =
  generatedNeonSeries.map((series) => ({
    neonSeriesId: series.neonSeriesId,
    neonSeriesName: series.neonSeriesName,
    publicKey: series.publicKey,
  }));

/**
 * Historical signup/pipeline keys that were renamed when cups left the
 * preference catalog. Still resolve for dual-read / remaps.
 */
const LEGACY_PUBLIC_KEY_ALIASES: Readonly<Record<string, string>> = {
  "antwerpen-bva-g1": "bva-heren-groep-1-p1-p2",
};

const byPublicKey = new Map(
  KNOWN_NEON_SERIES.map((s) => [s.publicKey, s] as const),
);

const byNeonId = new Map(KNOWN_NEON_SERIES.map((s) => [s.neonSeriesId, s]));

export function resolveSeriesRef(divisionKey: string): NeonSeriesRef | null {
  const aliased = LEGACY_PUBLIC_KEY_ALIASES[divisionKey] ?? divisionKey;
  return byPublicKey.get(aliased) ?? byNeonId.get(divisionKey) ?? null;
}

export function neonSeriesIdForDivision(divisionKey: string): string | null {
  return resolveSeriesRef(divisionKey)?.neonSeriesId ?? null;
}

/**
 * Normalize any known alias (including accidental Neon ids) to the readable
 * public key. Unknown keys are returned unchanged.
 */
export function toPublicDivisionKey(divisionKey: string): string {
  const ref = resolveSeriesRef(divisionKey);
  return ref?.publicKey ?? divisionKey;
}

/** @deprecated Use toPublicDivisionKey — public keys are canonical for storage/UI. */
export function canonicalizeDivisionKey(divisionKey: string): string {
  return toPublicDivisionKey(divisionKey);
}

/** Neon id → public key remaps (e.g. undo a mistaken CHP_* externalKey cutover). */
export function neonIdToPublicKeyRemaps(): ReadonlyArray<{
  from: string;
  to: string;
  neonSeriesName: string;
}> {
  return KNOWN_NEON_SERIES.map((series) => ({
    from: series.neonSeriesId,
    to: series.publicKey,
    neonSeriesName: series.neonSeriesName,
  }));
}

export function labelForDivisionKey(
  divisionKey: string,
  fallbackLabel?: string,
): string {
  const ref = resolveSeriesRef(divisionKey);
  if (ref) {
    return ref.neonSeriesName;
  }
  return fallbackLabel ?? divisionKey;
}
