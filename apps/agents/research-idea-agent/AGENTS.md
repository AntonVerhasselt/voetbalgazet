# eve Agent App — Research Idea Agent

This project uses the eve framework. Before changing agent files, read the
relevant guide from `node_modules/eve/docs/` (or https://eve.dev/docs).

## Conventions (De Voetbalgazet)

- **English:** TypeScript identifiers, Convex/JSON keys, tool filenames, evals
- **Dutch:** `instructions.md`, skills, tool `description` / Zod `.describe()`,
  orchestrator task messages, IdeaBatch string values
- **Model:** `zai/glm-5.2` in `agent/agent.ts`
- **Output:** `ideaBatchSchema` — exactly 5 ideas
- **Neon:** read-only via sandbox; do not invent stats or person ids
- **No** published-article archive search in this phase

See repo plans under `/plan`, especially `02-research-agent-eve.md` and
`09-dutch-agent-conventions.md`.
