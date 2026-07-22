/**
 * Editorial context stubs for known placeholder division keys.
 * Neon-aligned keys replace these in Phase B; keep labels Dutch.
 */

export type DivisionContext = {
  divisionKey: string;
  label: string;
  provinceKey: string | null;
  level: number | null;
  editorialPrefs: string[];
  audienceNotes: string;
};

const GENERIC_PREFS = [
  "Lokale, herkenbare verhalen boven generieke topsport-framing.",
  "Cijfers altijd in context van de reeks (tegenstanders, speeldag, seizoensfase).",
  "Geef de voorkeur aan hoeken die een interview waard zijn, ook als 0 kandidaten oké is.",
  "Vermijd transfergeruchten zonder data; focus op speelmomenten, stand, vorm, jeugd.",
];

const KNOWN: Record<
  string,
  Omit<DivisionContext, "divisionKey" | "editorialPrefs" | "audienceNotes"> & {
    editorialPrefs?: string[];
  }
> = {
  "antwerpen-p1": {
    label: "1ste provinciale Antwerpen",
    provinceKey: "antwerpen",
    level: 1,
  },
  "antwerpen-p2a": {
    label: "2de provinciale A Antwerpen",
    provinceKey: "antwerpen",
    level: 2,
  },
  "limburg-p1": {
    label: "1ste provinciale Limburg",
    provinceKey: "limburg",
    level: 1,
  },
  "oost-vlaanderen-p1": {
    label: "1ste provinciale Oost-Vlaanderen",
    provinceKey: "oost-vlaanderen",
    level: 1,
  },
  "vlaams-brabant-p1": {
    label: "1ste provinciale Vlaams-Brabant",
    provinceKey: "vlaams-brabant",
    level: 1,
  },
  "west-vlaanderen-p1": {
    label: "1ste provinciale West-Vlaanderen",
    provinceKey: "west-vlaanderen",
    level: 1,
  },
};

export function getDivisionContext(divisionKey: string): DivisionContext {
  const known = KNOWN[divisionKey];
  if (known) {
    return {
      divisionKey,
      label: known.label,
      provinceKey: known.provinceKey,
      level: known.level,
      editorialPrefs: [...GENERIC_PREFS, ...(known.editorialPrefs ?? [])],
      audienceNotes:
        "Lezers volgen vooral hun eigen club en buurclubs in deze provinciale reeks.",
    };
  }

  return {
    divisionKey,
    label: divisionKey,
    provinceKey: null,
    level: null,
    editorialPrefs: [...GENERIC_PREFS],
    audienceNotes:
      "Onbekende of Neon-native reeks-sleutel: behandel de meegegeven label in de taakprompt als leidend. Taxonomy wordt later Neon-aligned.",
  };
}
