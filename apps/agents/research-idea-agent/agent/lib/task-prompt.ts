/**
 * Dutch task prompt for the orchestrator / waiter (Phase D) and local `eve` sessions.
 * Keep in sync with plan/02-research-agent-eve.md and plan/09-dutch-agent-conventions.md.
 */

export type ResearchTaskInput = {
  divisionKey: string;
  divisionLabel: string;
  editorialPrefs?: string[];
  extraNotes?: string;
};

export function buildResearchTaskMessage(input: ResearchTaskInput): string {
  const prefs =
    input.editorialPrefs && input.editorialPrefs.length > 0
      ? input.editorialPrefs.map((line) => `- ${line}`).join("\n")
      : "- (geen extra voorkeuren meegegeven)";

  const notes = input.extraNotes?.trim()
    ? `\n## Extra notities\n${input.extraNotes.trim()}\n`
    : "";

  return `# Opdracht

Genereer precies **5** artikelideeën voor reeks \`${input.divisionKey}\` (${input.divisionLabel}).

## Redactionele voorkeuren
${prefs}
${notes}
## Reminder
- Alle menselijke tekstvelden in het **Nederlands**
- Exact 5 ideeën, elk met 3 titelvoorstellen
- Feiten grounded in Neon (alleen-lezen)
- Max 3 interviewkandidaten per idee; 0 mag
- Per kandidaat: \`interviewerNotes\` (wie / waarom / doel) + 1–8 concrete interviewvragen in \`questions\` (Nederlands)
- Lever het resultaat als IdeaBatch volgens het outputschema
`;
}
