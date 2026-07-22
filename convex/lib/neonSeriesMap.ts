/**
 * Placeholder YAML keys ↔ Neon series.id mapping (Phase B).
 * Canonical Pipeline divisionKey target: Neon `series.id` (e.g. CHP_130005).
 * Until taxonomy migration executes, Pipeline accepts both forms.
 */

export type NeonSeriesRef = {
  neonSeriesId: string;
  neonSeriesName: string;
  placeholderKey: string | null;
};

/** Known Neon series as of 2026-07-22 introspection (Antwerp seed). */
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
