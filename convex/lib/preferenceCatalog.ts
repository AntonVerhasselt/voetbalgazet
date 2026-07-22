import {
  generatedDivisionOptions,
  generatedTeamOptions,
} from "./generated/neonTaxonomyData";

export type DivisionOption = {
  key: string;
  label: string;
  shortLabel: string;
  provinceKey: string;
  provinceLabel: string;
  level: number;
  sortOrder: number;
};

export type TeamOption = {
  key: string;
  label: string;
  provinceKey: string;
  divisionKeys: readonly string[];
};

export type ProvinceOption = {
  key: string;
  label: string;
  shortLabel: string;
};

export const provinceOptions = [
  {
    key: "antwerpen",
    label: "Antwerpen",
    shortLabel: "Antw",
  },
  {
    key: "limburg",
    label: "Limburg",
    shortLabel: "Limb",
  },
  {
    key: "oost-vlaanderen",
    label: "Oost-Vlaanderen",
    shortLabel: "O-Vl",
  },
  {
    key: "vlaams-brabant",
    label: "Vlaams-Brabant",
    shortLabel: "Vl-Br",
  },
  {
    key: "west-vlaanderen",
    label: "West-Vlaanderen",
    shortLabel: "W-Vl",
  },
] as const satisfies readonly ProvinceOption[];

/**
 * Signup / preference divisions — provincial competitions only.
 * Generated from Neon (cups excluded). Short labels are province-local
 * (1, 2A, 3C, 4G, …).
 */
export const divisionOptions = generatedDivisionOptions.map((division) => ({
  key: division.key,
  label: division.label,
  shortLabel: division.shortLabel,
  provinceKey: division.provinceKey,
  provinceLabel: division.provinceLabel,
  level: division.level,
  sortOrder: division.sortOrder,
})) satisfies readonly DivisionOption[];

/**
 * Signup / preference teams — every Neon team linked to a provincial series.
 */
export const teamOptions = generatedTeamOptions.map((team) => ({
  key: team.key,
  label: team.label,
  provinceKey: team.provinceKey,
  divisionKeys: team.divisionKeys,
})) satisfies readonly TeamOption[];

export const divisionKeys: ReadonlySet<string> = new Set(
  divisionOptions.map((division) => division.key),
);
export const teamKeys: ReadonlySet<string> = new Set(
  teamOptions.map((team) => team.key),
);
