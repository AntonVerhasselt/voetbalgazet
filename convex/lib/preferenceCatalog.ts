export type DivisionOption = {
  key: string;
  label: string;
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

export const divisionOptions = [
  {
    key: "antwerpen-p1",
    label: "1ste provinciale Antwerpen",
    provinceKey: "antwerpen",
    provinceLabel: "Antwerpen",
    level: 1,
    sortOrder: 10,
  },
  {
    key: "antwerpen-p2",
    label: "2de provinciale Antwerpen",
    provinceKey: "antwerpen",
    provinceLabel: "Antwerpen",
    level: 2,
    sortOrder: 20,
  },
  {
    key: "limburg-p1",
    label: "1ste provinciale Limburg",
    provinceKey: "limburg",
    provinceLabel: "Limburg",
    level: 1,
    sortOrder: 30,
  },
  {
    key: "limburg-p2",
    label: "2de provinciale Limburg",
    provinceKey: "limburg",
    provinceLabel: "Limburg",
    level: 2,
    sortOrder: 40,
  },
  {
    key: "oost-vlaanderen-p1",
    label: "1ste provinciale Oost-Vlaanderen",
    provinceKey: "oost-vlaanderen",
    provinceLabel: "Oost-Vlaanderen",
    level: 1,
    sortOrder: 50,
  },
  {
    key: "oost-vlaanderen-p2",
    label: "2de provinciale Oost-Vlaanderen",
    provinceKey: "oost-vlaanderen",
    provinceLabel: "Oost-Vlaanderen",
    level: 2,
    sortOrder: 60,
  },
  {
    key: "vlaams-brabant-p1",
    label: "1ste provinciale Vlaams-Brabant",
    provinceKey: "vlaams-brabant",
    provinceLabel: "Vlaams-Brabant",
    level: 1,
    sortOrder: 70,
  },
  {
    key: "vlaams-brabant-p2",
    label: "2de provinciale Vlaams-Brabant",
    provinceKey: "vlaams-brabant",
    provinceLabel: "Vlaams-Brabant",
    level: 2,
    sortOrder: 80,
  },
  {
    key: "west-vlaanderen-p1",
    label: "1ste provinciale West-Vlaanderen",
    provinceKey: "west-vlaanderen",
    provinceLabel: "West-Vlaanderen",
    level: 1,
    sortOrder: 90,
  },
  {
    key: "west-vlaanderen-p2",
    label: "2de provinciale West-Vlaanderen",
    provinceKey: "west-vlaanderen",
    provinceLabel: "West-Vlaanderen",
    level: 2,
    sortOrder: 100,
  },
] as const satisfies readonly DivisionOption[];

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
    divisionKeys: ["antwerpen-p2"],
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
    divisionKeys: ["vlaams-brabant-p2"],
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
    divisionKeys: ["oost-vlaanderen-p2"],
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
    divisionKeys: ["limburg-p2"],
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
    divisionKeys: ["west-vlaanderen-p2"],
  },
] as const satisfies readonly TeamOption[];

export const divisionKeys = new Set(
  divisionOptions.map((division) => division.key),
);
export const teamKeys = new Set(teamOptions.map((team) => team.key));
