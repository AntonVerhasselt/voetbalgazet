# AI Journalist — Master Implementation Plan

This is the umbrella plan for De Voetbalgazet’s automated AI journalist system. Sibling docs go deep on each subsystem; this file is the single map of decisions, phases, and dependencies.

## Goal (Phase 1 scope)

Ship the **Research & Proposal (idea) agent** end-to-end:

1. Admin opens the **Pipeline** workspace (`/admin/pipeline`).
2. Selects a **reeks** (series / division) as the primary filter — keys come from **Neon**, not placeholders.
3. Triggers generation of **5 article ideas**.
4. Reviews each idea (approve / reject, toggle interviewees; **0 interviewees allowed**).
5. Approved ideas advance to later pipeline phases (contacts → interview → writer).

Out of scope for Phase 1 implementation (designed for, not built yet): WhatsApp Agent, OpenAI Realtime interview, Writer Graph, public publication of AI drafts.

## Locked decisions (latest)

| Topic | Decision |
|-------|----------|
| Neon | Source of truth for football data & naming; Convex taxonomy will be adapted to Neon |
| Approve w/ 0 interviewees | Allowed |
| Models | **Vercel AI Gateway** (supports cheap/open models); not OpenRouter for MVP |
| Agent location | `apps/agents/research-idea-agent/` → **own Vercel project**, still in monorepo |
| Admin naming | Nav **Pipeline**, routes `/admin/pipeline/*` |
| Archive (MVP) | Convex context pack + seeded Markdoc `archive-index.json` in sandbox (not Neon yet) |
| Phase A generate | Stub inserts **fixture ideas** until Eve is wired |

Full log + remaining questions: [`06-open-questions.md`](./06-open-questions.md).

## Current codebase baseline (researched)

| Area | Today | Implication |
|------|-------|-------------|
| Public articles | Keystatic Markdoc in Git only (`apps/web/content/articles`) | Pipeline is a **new Convex domain**. Archive for the agent = Git-derived index + Convex context (see archive plan). |
| Taxonomy | Placeholder YAML/Convex `antwerpen-p1` etc. | **Replace/adapt** to Neon division/club identifiers after schema inspect. |
| Admin | Artikels, Nieuwsbrieven, Abonnees | Add **Pipeline** nav + `/admin/pipeline`. |
| Auth | `admin` \| `journalist` \| `viewer` | Generate/approve = editor roles. |
| Convex | No actions yet | Need `"use node"` actions (or Next waiter) for Eve HTTP. |
| Agents | None | Add `apps/agents/research-idea-agent`. |

## Recommended system shape

```text
Admin UI (apps/web)  /admin/pipeline
      │  Convex mutations/queries
      ▼
Convex (pipeline state, research runs, approvals)
      │  start research run
      ▼
Convex action / Next Fluid waiter
      │  POST /eve/v1/session + outputSchema
      ▼
Eve research-idea-agent  (apps/agents/research-idea-agent → own Vercel project)
      │  sandbox: TypeScript + pg + schema docs + archive-index.json
      ▼
Neon (read-only football DB)
      │
      ▼
IdeaBatch[5] → Convex → human review → phase advance
```

**Hard rule:** Convex owns durable editorial state. Eve owns ephemeral research compute.

## Document index

| File | Contents |
|------|----------|
| [`00-overview.md`](./00-overview.md) | This file |
| [`01-architecture-and-data-model.md`](./01-architecture-and-data-model.md) | Phases, Convex schema, Neon-first identity |
| [`02-research-agent-eve.md`](./02-research-agent-eve.md) | Eve package, sandbox, archive, models |
| [`03-admin-ux-pipeline.md`](./03-admin-ux-pipeline.md) | Pipeline UX |
| [`04-convex-orchestration.md`](./04-convex-orchestration.md) | Research runs ↔ Eve |
| [`05-implementation-phases.md`](./05-implementation-phases.md) | Build order |
| [`06-open-questions.md`](./06-open-questions.md) | Decisions + remaining questions |

## Implementation phases (summary)

1. **A — Foundation** — schema, Pipeline UI, fixture generate stub  
2. **B — Neon** — connectivity, schema docs, **taxonomy realignment to Neon**  
3. **C — Eve agent** — `apps/agents/research-idea-agent` skeleton  
4. **D — Bridge** — real generate via Eve  
5. **E — Review UX polish**  
6. **F — Hardening**  
7. **G+** — later agents  

## Neon connectivity status

**Still not testable in this Cloud Agent session.** Env has no `NEON_DATABASE_URL`; Cursor secret list still only `AGENT_ACCESS_SECRET`, `CONVEX_DEPLOY_KEY`.

Add `NEON_DATABASE_URL` as a **Cursor Cloud Agent secret** (not only Vercel) and start a **new** agent run so it injects. Then we smoke-test read-only access.

## Success criteria for “Phase 1 done”

- [ ] Admin opens Pipeline, picks a Neon-aligned reeks.
- [ ] “Genereer 5 ideeën” locks while a run is active for that reeks.
- [ ] Exactly 5 structured ideas land (or clear failure, no partial insert).
- [ ] Review: fields, approve/reject, interviewee toggles (0 OK).
- [ ] Approve → `awaiting_contacts` (even with zero interviewees).
- [ ] Rejected retained for audit.
- [ ] Neon read-only; no invented stats (prompt + eval).
- [ ] Agent in isolated sandbox with restricted egress.
