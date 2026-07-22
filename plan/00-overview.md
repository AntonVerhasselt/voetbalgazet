# AI Journalist — Master Implementation Plan

Umbrella plan for De Voetbalgazet’s automated AI journalist. Sibling docs own deep detail; this file is the map.

## Goal (Phase 1 / idea agent)

1. Admin opens **Pipeline** (`/admin/pipeline`).
2. Selects a **reeks** (Neon-aligned series id).
3. Clicks **Genereer 5 ideeën** → exactly 5 ideas for **that** reeks.
4. Reviews ideas (approve/reject; toggle interviewees; **0 OK**).
5. Approved ideas → `awaiting_contacts` for later agents.

Out of scope now: WhatsApp, realtime interview, writer graph, auto-publish.

## Locked decisions (all)

| Topic | Decision |
|-------|----------|
| Football data | **Neon** source of truth; Convex taxonomy adapted to Neon |
| Archive | **Eve tools + Convex `articleArchive`**; sitemap optional secondary — [`07`](./07-article-archive-tools.md) |
| Contacts | First-class `contacts` + join table — [`08`](./08-contacts-data-model.md) |
| Approve w/ 0 interviewees | Allowed |
| Titles | Keep all 3 proposals; final title later |
| Rejected UI | Stay in DB; filtered out of default lists |
| Agent language | **Dutch everything** (instructions, tools, skills, output content) |
| Generate scope | Selected reeks only; batch of 5 |
| Concurrency (Q10) | **One running job per reeks**; other reeksen may run in parallel |
| Models | AI Gateway **`zai/glm-5.2`** (open-weight) |
| Agent home | `apps/agents/research-idea-agent` → own Vercel project |
| Waiter | Convex action **or** Next/Fluid OK |
| Naming | Pipeline / `/admin/pipeline/*` |
| Phase A | **Fixture ideas** yes |
| Youth interviewees | Allowed |
| Duplicates | Person = `neonPersonId`; story angle = archive tools |
| Schedule | Manual now; cron later |
| Regenerate | Full batch of 5 only |

## System shape

```text
Admin UI  /admin/pipeline  (apps/web)
      │
      ▼
Convex  pipeline* + contacts + articleArchive
      │  startResearchRun (per-reeks lock)
      ▼
Waiter (Convex action or Next/Fluid)
      │  POST Eve session + outputSchema
      ▼
Eve  apps/agents/research-idea-agent   [model: zai/glm-5.2]
      ├─ sandbox: TypeScript + pg → Neon (read-only)
      └─ tools: zoek_gepubliceerde_artikelen, … → Convex articleArchive
      │
      ▼
IdeaBatch[5] → upsert contacts → pipelineArticles + joins → UI review
```

## Document index

| File | Contents |
|------|----------|
| [`00-overview.md`](./00-overview.md) | This map |
| [`01-architecture-and-data-model.md`](./01-architecture-and-data-model.md) | Pipeline tables, phases |
| [`02-research-agent-eve.md`](./02-research-agent-eve.md) | Eve agent, Dutch, sandbox, model |
| [`03-admin-ux-pipeline.md`](./03-admin-ux-pipeline.md) | Pipeline UX |
| [`04-convex-orchestration.md`](./04-convex-orchestration.md) | Runs, locks, waiter |
| [`05-implementation-phases.md`](./05-implementation-phases.md) | Build order |
| [`06-open-questions.md`](./06-open-questions.md) | Decision log |
| [`07-article-archive-tools.md`](./07-article-archive-tools.md) | Archive tools design |
| [`08-contacts-data-model.md`](./08-contacts-data-model.md) | Contacts + joins |
| [`09-dutch-agent-conventions.md`](./09-dutch-agent-conventions.md) | Language rules |
| [`10-fixture-ideas-and-phase-a.md`](./10-fixture-ideas-and-phase-a.md) | Fixture generate stub |

## Neon status

Docs + connectivity smoke happen in the **next** Cloud Agent session (secret will be available). This session still lacked `NEON_DATABASE_URL` injection.

## Success criteria (idea-agent MVP)

- [ ] Pipeline UI with reeks selector + phase strip  
- [ ] Generate 5 for selected reeks; button disabled while that reeks has active run  
- [ ] Real Eve path: Dutch structured ideas + archive tool use + Neon-grounded facts  
- [ ] Contacts upserted with club/team ids+names; toggles; approve with 0 OK  
- [ ] Rejected hidden in UI, retained in DB  
- [ ] All 3 titles kept on approve  
- [ ] Neon read-only; no invented stats  
