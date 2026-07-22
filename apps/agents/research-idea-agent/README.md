# Research Idea Agent (Eve)

Autonomous data journalist for **one** Neon-aligned reeks. Explores Neon in a
sandbox and returns **exactly 5** idea proposals (`IdeaBatch`) with grounded
facts and optional interviewees.

Plan references: [`plan/02-research-agent-eve.md`](../../../plan/02-research-agent-eve.md),
[`plan/09-dutch-agent-conventions.md`](../../../plan/09-dutch-agent-conventions.md).

## Stack

| Piece | Choice |
|-------|--------|
| Framework | [eve](https://eve.dev) `^0.27` |
| Model | `zai/glm-5.2` (AI Gateway) |
| Football data | Neon via sandbox `pg` (read-only) |
| Language | Code/keys English; prompts + output strings Dutch |

## Layout

```text
agent/
  agent.ts                 # model + outputSchema (IdeaBatch)
  instructions.md          # Dutch system prompt
  channels/eve.ts          # OIDC / localDev / EVE_INVOKE_TOKEN
  lib/                     # IdeaBatch Zod, Dutch heuristic, task prompt
  tools/get_division_context.ts
  skills/                  # Dutch procedures
  sandbox/
    sandbox.ts             # Neon env + network allow-list
    workspace/             # seeded → /workspace (docs, pg, research/)
evals/                     # shape + Dutch fixture checks
```

## Local dev

```bash
cd apps/agents/research-idea-agent
cp .env.example .env.local   # set NEON_DATABASE_URL when available
npm install
npx eve link                 # link Vercel project when deploying
npm run dev                  # eve dev
```

Example session message (Dutch):

```text
Genereer precies 5 artikelideeën voor reeks antwerpen-p1 (1ste provinciale Antwerpen).
…
```

Helper: `buildResearchTaskMessage` in `agent/lib/task-prompt.ts`.

## Checks

```bash
npm run typecheck
npm test                     # vitest (schema / Dutch / prompt)
npm run eval                 # eve eval (boots local runtime)
```

## Deploy

Separate Vercel project with **Root Directory** `apps/agents/research-idea-agent`.

Required env:

- `NEON_DATABASE_URL` (read-only)
- `EVE_INVOKE_TOKEN` (optional now; used by Phase D waiter)

## Out of scope (this phase)

- Article-archive search / dedupe against published site articles
- Convex orchestration bridge (Phase D)
- Real Neon schema docs (Phase B — placeholder under `sandbox/workspace/docs/`)
