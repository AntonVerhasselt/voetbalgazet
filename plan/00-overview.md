# AI Journalist — Master Implementation Plan

Umbrella plan for De Voetbalgazet’s automated AI journalist. Sibling docs own deep detail; this file is the map.

## Goal (Phase 1 / idea agent)

1. Admin opens **Pipeline** (`/admin/pipeline`).
2. Selects a **reeks** (Neon-aligned series id).
3. Clicks **Genereer 5 ideeën** → exactly 5 ideas for **that** reeks.
4. Reviews ideas (approve/reject; toggle interviewees; **0 OK**).
5. Approved ideas → `awaiting_contacts` for later agents.

Out of scope now: WhatsApp, realtime interview, writer graph, auto-publish, **article-archive search / dedupe against published site articles**.

## Locked decisions (all)

| Topic | Decision |
|-------|----------|
| Football data | **Neon** source of truth; Convex taxonomy adapted to Neon |
| Article archive search | **Out of scope** for this phase — revisit later |
| Contacts | First-class `contacts` + join table — [`08`](./08-contacts-data-model.md) |
| Approve w/ 0 interviewees | Allowed |
| Titles | Keep all 3 proposals; final title later |
| Rejected UI | Stay in DB; filtered out of default lists |
| Language | **Code/API English**; **everything sent to the agent + agent output content = Dutch** — [`09`](./09-dutch-agent-conventions.md) |
| Generate scope | Selected reeks only; batch of 5 |
| Concurrency (Q10) | **Block generate only for that division**; other reeksen unaffected |
| Models | AI Gateway **`zai/glm-5.2`** (open-weight) |
| Agent home | `apps/agents/research-idea-agent` → own Vercel project |
| Waiter | Convex action **or** Next/Fluid OK |
| Naming | Pipeline / `/admin/pipeline/*` |
| Phase A | **Fixture ideas** yes |
| Youth interviewees | Allowed |
| Contact identity | `neonPersonId` unique |
| Schedule | Manual now; cron later |
| Regenerate | Full batch of 5 only |

## System shape

```text
Admin UI  /admin/pipeline  (apps/web)
      │
      ▼
Convex  pipeline* + contacts
      │  startResearchRun (lock only this divisionKey)
      ▼
Waiter (Convex action or Next/Fluid)
      │  POST Eve session + outputSchema
      │  (Dutch task message)
      ▼
Eve  apps/agents/research-idea-agent   [model: zai/glm-5.2]
      │  sandbox: TypeScript + pg → Neon (read-only)
      │  (Dutch instructions / tool descriptions)
      ▼
IdeaBatch[5] (English keys, Dutch string values)
      → upsert contacts → pipelineArticles + joins → UI review
```

## Document index

| File | Contents |
|------|----------|
| [`00-overview.md`](./00-overview.md) | This map |
| [`01-architecture-and-data-model.md`](./01-architecture-and-data-model.md) | Pipeline tables, phases |
| [`02-research-agent-eve.md`](./02-research-agent-eve.md) | Eve agent, sandbox, model |
| [`03-admin-ux-pipeline.md`](./03-admin-ux-pipeline.md) | Pipeline UX |
| [`04-convex-orchestration.md`](./04-convex-orchestration.md) | Runs, locks, waiter |
| [`05-implementation-phases.md`](./05-implementation-phases.md) | Build order |
| [`06-open-questions.md`](./06-open-questions.md) | Decision log |
| [`08-contacts-data-model.md`](./08-contacts-data-model.md) | Contacts + Neon linkage |
| [`09-dutch-agent-conventions.md`](./09-dutch-agent-conventions.md) | English code vs Dutch agent I/O |
| [`10-fixture-ideas-and-phase-a.md`](./10-fixture-ideas-and-phase-a.md) | Fixture generate stub |

## Neon status

Docs + connectivity smoke happen in the **next** Cloud Agent session (secret available then).

## Success criteria (idea-agent MVP)

- [ ] Pipeline UI with reeks selector + phase strip  
- [ ] Generate 5 for selected reeks; button disabled **only** for that reeks while active  
- [ ] Real Eve path: Dutch prompts/output content + Neon-grounded facts  
- [ ] Contacts upserted with club/team ids+names; toggles; approve with 0 OK  
- [ ] Rejected hidden in UI, retained in DB  
- [ ] All 3 titles kept on approve  
- [ ] Neon read-only; no invented stats  
