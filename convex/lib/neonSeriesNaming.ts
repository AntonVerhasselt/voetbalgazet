/**
 * Parse Neon series names into readable public keys / signup labels.
 *
 * Provincial competitions (e.g. "2 Provinciaal Antw A") become signup
 * divisions with short labels ("2A"). Cups / beker series are mapped for
 * research SQL only — never offered in the subscriber division selector.
 */

export type ProvinceKey =
  | "antwerpen"
  | "limburg"
  | "oost-vlaanderen"
  | "vlaams-brabant"
  | "west-vlaanderen";

export type NeonSeriesRow = {
  id: string;
  name: string;
  age_group?: string | null;
  channel?: string | null;
};

export type ParsedProvincialSeries = {
  kind: "provincial";
  neonSeriesId: string;
  neonSeriesName: string;
  publicKey: string;
  provinceKey: ProvinceKey;
  provinceLabel: string;
  level: number;
  /** Group letter when present (A–G), else null for undivided P1. */
  group: string | null;
  shortLabel: string;
  catalogLabel: string;
  sortOrder: number;
};

export type ParsedOtherSeries = {
  kind: "cup" | "other";
  neonSeriesId: string;
  neonSeriesName: string;
  publicKey: string;
  isCup: true | false;
};

export type ParsedSeries = ParsedProvincialSeries | ParsedOtherSeries;

const PROVINCE_BY_NEON_SUFFIX: ReadonlyArray<{
  neonSuffix: string;
  provinceKey: ProvinceKey;
  provinceLabel: string;
  provinceIndex: number;
}> = [
  {
    neonSuffix: "Antw",
    provinceKey: "antwerpen",
    provinceLabel: "Antwerpen",
    provinceIndex: 0,
  },
  {
    neonSuffix: "Limb",
    provinceKey: "limburg",
    provinceLabel: "Limburg",
    provinceIndex: 1,
  },
  {
    neonSuffix: "Ovl",
    provinceKey: "oost-vlaanderen",
    provinceLabel: "Oost-Vlaanderen",
    provinceIndex: 2,
  },
  {
    neonSuffix: "Vl Brab",
    provinceKey: "vlaams-brabant",
    provinceLabel: "Vlaams-Brabant",
    provinceIndex: 3,
  },
  {
    neonSuffix: "Wvl",
    provinceKey: "west-vlaanderen",
    provinceLabel: "West-Vlaanderen",
    provinceIndex: 4,
  },
];

const LEVEL_DUTCH: Record<number, string> = {
  1: "1ste provinciale",
  2: "2de provinciale",
  3: "3de provinciale",
  4: "4de provinciale",
};

/** Match "2 Provinciaal Antw A" / "1 Provinciaal Limb". */
const PROVINCIAL_RE =
  /^(\d)\s+Provinciaal\s+(.+?)(?:\s+([A-Za-z]))?$/u;

export function isCupSeries(series: Pick<NeonSeriesRow, "id" | "name">): boolean {
  if (series.id.startsWith("CUP_")) {
    return true;
  }
  const name = series.name;
  if (/\bBeker\b/iu.test(name) || /\bCup\b/iu.test(name)) {
    return true;
  }
  // Beker van Antwerpen / Limburg / … abbreviations in Neon feeds
  if (/^Bv[A-Z]/u.test(name) || /^B v\b/iu.test(name)) {
    return true;
  }
  return false;
}

export function slugifyKey(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/&/gu, " en ")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .replace(/-{2,}/gu, "-");
}

function resolveProvince(neonSuffix: string) {
  const trimmed = neonSuffix.trim();
  return (
    PROVINCE_BY_NEON_SUFFIX.find((entry) => entry.neonSuffix === trimmed) ?? null
  );
}

function levelDutch(level: number): string {
  return LEVEL_DUTCH[level] ?? `${level}de provinciale`;
}

export function parseNeonSeries(series: NeonSeriesRow): ParsedSeries {
  const provincial = PROVINCIAL_RE.exec(series.name.trim());
  if (provincial) {
    const level = Number(provincial[1]);
    const neonSuffix = provincial[2]!.trim();
    const groupRaw = provincial[3]?.toUpperCase() ?? null;
    const province = resolveProvince(neonSuffix);
    if (province && level >= 1 && level <= 9) {
      const group = groupRaw && /^[A-Z]$/u.test(groupRaw) ? groupRaw : null;
      const keySuffix =
        group === null ? `p${level}` : `p${level}${group.toLowerCase()}`;
      const shortLabel = group === null ? String(level) : `${level}${group}`;
      const catalogLabel =
        group === null
          ? `${levelDutch(level)} ${province.provinceLabel}`
          : `${levelDutch(level)} ${group} ${province.provinceLabel}`;
      const groupOrder = group ? group.charCodeAt(0) - 64 : 0;
      return {
        kind: "provincial",
        neonSeriesId: series.id,
        neonSeriesName: series.name,
        publicKey: `${province.provinceKey}-${keySuffix}`,
        provinceKey: province.provinceKey,
        provinceLabel: province.provinceLabel,
        level,
        group,
        shortLabel,
        catalogLabel,
        sortOrder: province.provinceIndex * 100 + level * 10 + groupOrder,
      };
    }
  }

  const cup = isCupSeries(series);
  const baseSlug = slugifyKey(series.name) || slugifyKey(series.id);
  return {
    kind: cup ? "cup" : "other",
    neonSeriesId: series.id,
    neonSeriesName: series.name,
    publicKey: baseSlug,
    isCup: cup,
  };
}

export function parseAllNeonSeries(
  rows: readonly NeonSeriesRow[],
): ParsedSeries[] {
  const usedKeys = new Map<string, string>();
  const result: ParsedSeries[] = [];
  for (const row of rows) {
    const parsed = parseNeonSeries(row);
    let publicKey = parsed.publicKey;
    const owner = usedKeys.get(publicKey);
    if (owner && owner !== parsed.neonSeriesId) {
      publicKey = `${publicKey}-${slugifyKey(parsed.neonSeriesId)}`;
    }
    usedKeys.set(publicKey, parsed.neonSeriesId);
    result.push({ ...parsed, publicKey });
  }
  return result;
}

export function provincialSignupDivisions(
  parsed: readonly ParsedSeries[],
): ParsedProvincialSeries[] {
  return parsed
    .filter((entry): entry is ParsedProvincialSeries => entry.kind === "provincial")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.publicKey.localeCompare(b.publicKey));
}

export type NeonTeamRow = {
  team_id: string;
  club_id: string;
  club_name: string;
  complement: string | null;
  display_name: string | null;
  series_id: string;
};

export type SignupTeamOption = {
  key: string;
  label: string;
  provinceKey: ProvinceKey;
  divisionKeys: string[];
  neonTeamId: string;
  neonClubId: string;
};

/**
 * Build signup team options from series_teams rows that belong to provincial
 * competitions. One option per Neon team_id; divisionKeys lists every
 * provincial public key the team appears in.
 */
export function buildSignupTeams(
  teamRows: readonly NeonTeamRow[],
  provincialByNeonId: ReadonlyMap<string, ParsedProvincialSeries>,
): SignupTeamOption[] {
  type Acc = {
    neonTeamId: string;
    neonClubId: string;
    label: string;
    provinceKey: ProvinceKey;
    divisionKeys: Set<string>;
  };
  const byTeam = new Map<string, Acc>();

  for (const row of teamRows) {
    const series = provincialByNeonId.get(row.series_id);
    if (!series) continue;
    const label =
      (row.display_name && row.display_name.trim()) ||
      (row.club_name && row.club_name.trim()) ||
      `Team ${row.team_id}`;
    const existing = byTeam.get(row.team_id);
    if (existing) {
      existing.divisionKeys.add(series.publicKey);
      continue;
    }
    byTeam.set(row.team_id, {
      neonTeamId: row.team_id,
      neonClubId: row.club_id,
      label,
      provinceKey: series.provinceKey,
      divisionKeys: new Set([series.publicKey]),
    });
  }

  const usedKeys = new Map<string, string>();
  const options: SignupTeamOption[] = [];
  const sorted = [...byTeam.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "nl-BE"),
  );

  for (const team of sorted) {
    let key = slugifyKey(team.label);
    if (!key) {
      key = `team-${team.neonTeamId}`;
    }
    const owner = usedKeys.get(key);
    if (owner && owner !== team.neonTeamId) {
      key = `${key}-${team.neonTeamId}`;
    }
    usedKeys.set(key, team.neonTeamId);
    options.push({
      key,
      label: team.label,
      provinceKey: team.provinceKey,
      divisionKeys: [...team.divisionKeys].sort(),
      neonTeamId: team.neonTeamId,
      neonClubId: team.neonClubId,
    });
  }

  return options;
}

/** Preserve a few legacy content keys when Neon labels change wording. */
export const LEGACY_TEAM_KEY_ALIASES: Readonly<Record<string, string>> = {
  // Articles historically used these sample keys.
  "football-club-duffel-a": "kfc-duffel",
  "sv-aartselaar-a": "ksv-aartselaar",
  "tor-deurne-pirates": "tor-deurne-pirates",
};

export function applyLegacyTeamKey(
  option: SignupTeamOption,
): SignupTeamOption {
  const legacy = LEGACY_TEAM_KEY_ALIASES[option.key];
  if (!legacy) return option;
  return { ...option, key: legacy };
}
