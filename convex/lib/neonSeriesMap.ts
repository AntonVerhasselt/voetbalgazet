/**
 * Placeholder YAML keys ↔ Neon series.id mapping.
 * Canonical divisionKey / externalKey: Neon `series.id` (e.g. CHP_130005).
 * Legacy placeholders remain as read aliases (localStorage, old content, agent).
 */

export type NeonSeriesRef = {
  neonSeriesId: string;
  neonSeriesName: string;
  /** Legacy catalog key before Neon remap; kept for dual-read aliases. */
  placeholderKey: string | null;
};

/** Known Neon series as of 2026-07-22 introspection (Antwerp seed only).
 *
 * TODO(taxonomy): Anton will provide Neon series.id for ALL remaining reeksen.
 * When that list arrives, remap every placeholder in one pass (catalog, YAML,
 * articles, Convex divisions.externalKey) — see plan/06-open-questions.md.
 */
export const KNOWN_NEON_SERIES: readonly NeonSeriesRef[] = [
  {
    neonSeriesId: "CHP_130005",
    neonSeriesName: "1 Provinciaal Antw",
    placeholderKey: "antwerpen-p1",
  },
  {
    neonSeriesId: "CHP_136335",
    neonSeriesName: "2 Provinciaal Antw A",
    placeholderKey: "antwerpen-p2a",
  },
  {
    neonSeriesId: "CHP_134688",
    neonSeriesName: "BvA Heren Groep 1 P1/P2",
    placeholderKey: null,
  },
] as const;

const byPlaceholder = new Map(
  KNOWN_NEON_SERIES.filter((s) => s.placeholderKey).map((s) => [
    s.placeholderKey!,
    s,
  ]),
);

const byNeonId = new Map(KNOWN_NEON_SERIES.map((s) => [s.neonSeriesId, s]));

export function resolveSeriesRef(divisionKey: string): NeonSeriesRef | null {
  return byNeonId.get(divisionKey) ?? byPlaceholder.get(divisionKey) ?? null;
}

export function neonSeriesIdForDivision(divisionKey: string): string | null {
  return resolveSeriesRef(divisionKey)?.neonSeriesId ?? null;
}

/** Prefer Neon series.id whenever a mapping exists; otherwise keep the key. */
export function canonicalizeDivisionKey(divisionKey: string): string {
  return neonSeriesIdForDivision(divisionKey) ?? divisionKey;
}

/** Legacy placeholder → Neon id remaps for taxonomy migration. */
export function legacyPlaceholderRemaps(): ReadonlyArray<{
  from: string;
  to: string;
  neonSeriesName: string;
}> {
  return KNOWN_NEON_SERIES.filter(
    (series): series is NeonSeriesRef & { placeholderKey: string } =>
      series.placeholderKey !== null,
  ).map((series) => ({
    from: series.placeholderKey,
    to: series.neonSeriesId,
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
