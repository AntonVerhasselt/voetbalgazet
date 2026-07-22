# English Code vs Dutch Agent I/O

## Rule

| Layer | Language |
|-------|----------|
| Application code (TS/TSX), Convex functions, schema field names, JSON **keys**, Eve tool **filenames**, evals, scripts | **English** |
| Everything **sent to the agent** (instructions, skills, tool descriptions, Zod `.describe()`, orchestrator task messages) | **Dutch** |
| Agent **output content** (human-readable strings in IdeaBatch) | **Dutch** |
| Admin UI labels | Dutch (product language) |

## Examples

**English (code):**

```ts
export const startResearchRun = editorMutation({ ... });
type IdeaProposal = { ideaTitle: string; titleProposals: [string, string, string] };
// tools/get_division_context.ts  (if we add tools later)
```

**Dutch (sent to / produced by the agent):**

```md
<!-- agent/instructions.md -->
Je bent de research- en voorstelagent van De Voetbalgazet …
```

```ts
defineTool({
  description: "Geeft redactionele voorkeuren terug voor een reeks.",
  inputSchema: z.object({
    divisionKey: z.string().describe("De Neon-reeks-id waarvoor je research doet"),
  }),
});
```

Task message example: `Genereer precies 5 artikelideeën voor reeks …`

## IdeaBatch

- Keys: English (`ideaTitle`, `whyInteresting`, …)  
- Values: Dutch prose  
- Schema descriptions shown to the model: Dutch  

## Instructions skeleton (Dutch content)

```markdown
# Identiteit
Je bent de research- en voorstelagent van De Voetbalgazet …

# Harde regels
- Schrijf alle menselijke tekstvelden in het Nederlands
- Nooit statistieken verzinnen
- Database alleen-lezen
- Exact 5 ideeën

# Werkwijze
1. Lees de schema-documentatie in de sandbox
2. Verken Neon met TypeScript/SQL
3. Lever een IdeaBatch volgens het schema
```
