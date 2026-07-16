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

const divisionSeries = [
  {
    keySuffix: "p1",
    shortLabel: "1",
    label: "1ste provinciale",
    level: 1,
  },
  {
    keySuffix: "p2a",
    shortLabel: "2A",
    label: "2de provinciale A",
    level: 2,
  },
  {
    keySuffix: "p2b",
    shortLabel: "2B",
    label: "2de provinciale B",
    level: 2,
  },
  {
    keySuffix: "p3a",
    shortLabel: "3A",
    label: "3de provinciale A",
    level: 3,
  },
  {
    keySuffix: "p3b",
    shortLabel: "3B",
    label: "3de provinciale B",
    level: 3,
  },
  {
    keySuffix: "p3c",
    shortLabel: "3C",
    label: "3de provinciale C",
    level: 3,
  },
] as const;

export const divisionOptions = provinceOptions.flatMap(
  (province, provinceIndex) =>
    divisionSeries.map((division, divisionIndex) => ({
      key: `${province.key}-${division.keySuffix}`,
      label: `${division.label} ${province.label}`,
      shortLabel: division.shortLabel,
      provinceKey: province.key,
      provinceLabel: province.label,
      level: division.level,
      sortOrder: provinceIndex * 100 + divisionIndex,
    })),
) satisfies readonly DivisionOption[];

export const teamOptions = [
  {
    key: "kfc-duffel",
    label: "KFC Duffel",
    provinceKey: "antwerpen",
    divisionKeys: ["antwerpen-p1"],
  },
  {
    key: "ksv-aartselaar",
    label: "KSV Aartselaar",
    provinceKey: "antwerpen",
    divisionKeys: ["antwerpen-p1"],
  },
  {
    key: "tor-deurne-pirates",
    label: "TOR Deurne Pirates",
    provinceKey: "antwerpen",
    divisionKeys: ["antwerpen-p2a"],
  },
  {
    key: "fc-landen",
    label: "FC Landen",
    provinceKey: "vlaams-brabant",
    divisionKeys: ["vlaams-brabant-p1"],
  },
  {
    key: "kvc-kessel-lo",
    label: "KVC Kessel-Lo",
    provinceKey: "vlaams-brabant",
    divisionKeys: ["vlaams-brabant-p2a"],
  },
  {
    key: "kfc-merelbeke",
    label: "KFC Merelbeke",
    provinceKey: "oost-vlaanderen",
    divisionKeys: ["oost-vlaanderen-p1"],
  },
  {
    key: "kfc-heusden-sport",
    label: "KFC Heusden Sport",
    provinceKey: "oost-vlaanderen",
    divisionKeys: ["oost-vlaanderen-p2a"],
  },
  {
    key: "kfc-helson",
    label: "KFC Helson",
    provinceKey: "limburg",
    divisionKeys: ["limburg-p1"],
  },
  {
    key: "kfc-paal-tervant",
    label: "KFC Paal-Tervant",
    provinceKey: "limburg",
    divisionKeys: ["limburg-p2a"],
  },
  {
    key: "kfc-varsenaere",
    label: "KFC Varsenaere",
    provinceKey: "west-vlaanderen",
    divisionKeys: ["west-vlaanderen-p1"],
  },
  {
    key: "kfc-lendelede-sport",
    label: "KFC Lendelede Sport",
    provinceKey: "west-vlaanderen",
    divisionKeys: ["west-vlaanderen-p2a"],
  },
] as const satisfies readonly TeamOption[];

export const divisionKeys: ReadonlySet<string> = new Set(
  divisionOptions.map((division) => division.key),
);
export const teamKeys: ReadonlySet<string> = new Set(
  teamOptions.map((team) => team.key),
);
