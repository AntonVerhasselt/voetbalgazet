/**
 * Division context for the research agent.
 * Public keys are readable kebab-case; Neon series.id is for SQL only.
 */

export type DivisionContext = {
  divisionKey: string;
  label: string;
  provinceKey: string | null;
  level: number | null;
  neonSeriesId: string | null;
  editorialPrefs: string[];
  audienceNotes: string;
};

const GENERIC_PREFS = [
  "Lokale, herkenbare verhalen boven generieke topsport-framing.",
  "Cijfers altijd in context van de reeks (tegenstanders, speeldag, seizoensfase).",
  "Geef de voorkeur aan hoeken die een interview waard zijn, ook als 0 kandidaten oké is.",
  "Vermijd transfergeruchten zonder data; focus op speelmomenten, stand, vorm, jeugd.",
  "Gebruik Neon series.id in SQL (zie /workspace/docs/neon-schema.md).",
];

const KNOWN: Record<
  string,
  Omit<DivisionContext, "divisionKey" | "editorialPrefs" | "audienceNotes">
> = {
  "antwerpen-p1": {
    label: "1ste provinciale Antwerpen",
    provinceKey: "antwerpen",
    level: 1,
    neonSeriesId: "CHP_130005",
  },
  "antwerpen-p2a": {
    label: "2de provinciale A Antwerpen",
    provinceKey: "antwerpen",
    level: 2,
    neonSeriesId: "CHP_136335",
  },
  "antwerpen-bva-g1": {
    label: "BvA Heren Groep 1 P1/P2",
    provinceKey: "antwerpen",
    level: 1,
    neonSeriesId: "CHP_134688",
  },
  // Accidental Neon-id lookups still resolve to the same context.
  CHP_130005: {
    label: "1ste provinciale Antwerpen",
    provinceKey: "antwerpen",
    level: 1,
    neonSeriesId: "CHP_130005",
  },
  CHP_136335: {
    label: "2de provinciale A Antwerpen",
    provinceKey: "antwerpen",
    level: 2,
    neonSeriesId: "CHP_136335",
  },
  CHP_134688: {
    label: "BvA Heren Groep 1 P1/P2",
    provinceKey: "antwerpen",
    level: 1,
    neonSeriesId: "CHP_134688",
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
      neonSeriesId: known.neonSeriesId,
      editorialPrefs: [...GENERIC_PREFS],
      audienceNotes:
        "Lezers volgen vooral hun eigen club en buurclubs in deze provinciale reeks.",
    };
  }

  return {
    divisionKey,
    label: divisionKey,
    provinceKey: null,
    level: null,
    neonSeriesId: divisionKey.startsWith("CHP_") ? divisionKey : null,
    editorialPrefs: [...GENERIC_PREFS],
    audienceNotes:
      "Onbekende reeks-sleutel: behandel de meegegeven label in de taakprompt als leidend. Zoek series.id in Neon.",
  };
}
