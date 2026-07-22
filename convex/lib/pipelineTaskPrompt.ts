import {
  labelForDivisionKey,
  neonSeriesIdForDivision,
} from "./neonSeriesMap";

export function buildResearchTaskMessage(input: {
  divisionKey: string;
  divisionLabel?: string;
  editorialPrefs?: string[];
  extraNotes?: string;
}): string {
  const label = input.divisionLabel ?? labelForDivisionKey(input.divisionKey);
  const neonId = neonSeriesIdForDivision(input.divisionKey);
  const prefs =
    input.editorialPrefs && input.editorialPrefs.length > 0
      ? input.editorialPrefs.map((line) => `- ${line}`).join("\n")
      : "- Lokale, herkenbare verhalen boven generieke topsport-framing.\n- Cijfers altijd in context van de reeks.";

  const neonLine = neonId
    ? `\nNeon series.id voor SQL-filters: \`${neonId}\` (gebruik dit in WHERE series_id = …).`
    : `\nGeen bekende Neon-mapping voor \`${input.divisionKey}\` — zoek de juiste series.id via \`SELECT id, name FROM series\`.\n`;

  const notes = input.extraNotes?.trim()
    ? `\n## Extra notities\n${input.extraNotes.trim()}\n`
    : "";

  return `# Opdracht

Genereer precies **5** artikelideeën voor reeks \`${input.divisionKey}\` (${label}).
${neonLine}
## Redactionele voorkeuren
${prefs}
${notes}
## Reminder
- Alle menselijke tekstvelden in het **Nederlands**
- Exact 5 ideeën, elk met 3 titelvoorstellen
- Feiten grounded in Neon (alleen-lezen SELECT)
- Max 3 interviewkandidaten per idee; 0 mag
- Lever het resultaat als IdeaBatch volgens het outputschema
`;
}
