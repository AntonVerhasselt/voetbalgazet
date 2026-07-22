/**
 * Readable public division keys ↔ Neon series.id mapping.
 *
 * Rules:
 * - User-facing keys (signup, YAML, Keystatic, pipeline UI, Convex
 *   `divisions.externalKey`, pipeline `divisionKey`) are ALWAYS readable
 *   kebab-case (e.g. `antwerpen-p1`). Never expose Neon ids to users.
 * - Neon `series.id` (e.g. `CHP_130005`) is for SQL / agent research only.
 */

export type NeonSeriesRef = {
  neonSeriesId: string;
  neonSeriesName: string;
  /** Readable public key used everywhere in the product UI / catalog. */
  publicKey: string;
};

/**
 * Known Neon series ↔ public keys (Antwerp seed as of 2026-07-22).
 *
 * TODO(taxonomy): Anton will provide Neon series.id for ALL remaining reeksen.
 * When that list arrives, extend this map only — do NOT replace public keys
 * with CHP_* ids. See plan/06-open-questions.md.
 */
export const KNOWN_NEON_SERIES: readonly NeonSeriesRef[] = [
  {
    neonSeriesId: "CHP_130005",
    neonSeriesName: "1 Provinciaal Antw",
    publicKey: "antwerpen-p1",
  },
  {
    neonSeriesId: "CHP_136335",
    neonSeriesName: "2 Provinciaal Antw A",
    publicKey: "antwerpen-p2a",
  },
  {
    neonSeriesId: "CHP_134688",
    neonSeriesName: "BvA Heren Groep 1 P1/P2",
    publicKey: "antwerpen-bva-g1",
  },
] as const;

const byPublicKey = new Map(
  KNOWN_NEON_SERIES.map((s) => [s.publicKey, s] as const),
);

const byNeonId = new Map(KNOWN_NEON_SERIES.map((s) => [s.neonSeriesId, s]));

export function resolveSeriesRef(divisionKey: string): NeonSeriesRef | null {
  return byPublicKey.get(divisionKey) ?? byNeonId.get(divisionKey) ?? null;
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
