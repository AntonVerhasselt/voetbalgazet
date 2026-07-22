# AI Journalist — Master Implementation Plan

This is the umbrella plan for De Voetbalgazet’s automated AI journalist system. Sibling docs go deep on each subsystem; this file is the single map of decisions, phases, and dependencies.

## Goal (Phase 1 scope)

Ship the **Research & Proposal Agent** end-to-end:

1. Admin opens a new **AI Journalist** workspace.
2. Selects a **reeks** (series / division) as the primary filter.
3. Triggers generation of **5 article ideas**.
4. Reviews each idea (approve / reject, toggle interviewees).
5. Approved ideas become pipeline articles ready for later agents (WhatsApp contacts → interview → writer).

Out of scope for Phase 1 implementation (designed for, not built yet): WhatsApp Agent, OpenAI Realtime interview, Writer Graph, public publication of AI drafts.

## Current codebase baseline (researched)

| Area | Today | Implication |
|------|-------|-------------|
| Public articles | Keystatic Markdoc in Git (`apps/web/content/articles`) | AI pipeline articles are a **new Convex domain**, not Keystatic yet. Publish bridge comes later. |
| Taxonomy | `divisions` / `teams` in Convex + YAML catalog (`antwerpen-p1`, …) | **Series = division** (`externalKey` / catalog key). Reuse existing division catalog. |
| Admin | `/admin` shell: Artikels, Nieuwsbrieven, Abonnees | Add nav item + routes under `/admin/journalist` (or `/admin/pipeline`). |
| Auth | Better Auth + roles `admin` \| `journalist` \| `viewer` | Idea generate/approve = `editorMutation` (admin+journalist). Viewer can read pipeline optionally. |
| Convex | Queries/mutations only; **no actions yet** | Need `"use node"` actions (or Next API) to call Eve HTTP. |
| Agents | None; no `agents/` directory | Add Eve agent package + deploy strategy. |
| Neon | User says `NEON_DATABASE_URL` is on **Vercel**; **not** in Cursor Cloud Agent secrets | Cannot connectivity-test from this agent VM until the secret is also available here (or via `vercel env pull`). |

## Recommended system shape

```text
Admin UI (Next.js)
      │  Convex mutations/queries
      ▼
Convex (source of truth for pipeline state)
      │  start research run
      ▼
Convex action / thin Next route
      │  POST /eve/v1/session + outputSchema
      ▼
Eve Research Agent (separate Vercel project)
      │  sandbox: TypeScript + pg + schema docs
      ▼
Neon (read-only)  +  article archive (read)
      │
      ▼
Structured result: IdeaProposal[5]
      │
      ▼
Convex stores ideas → UI review → approval advances phase
```

**Hard rule:** Convex owns durable editorial state (phases, approvals, contacts, transcripts, drafts). Eve owns ephemeral research compute. Eve sessions are workers, not the system of record.

## Document index

| File | Contents |
|------|----------|
| [`00-overview.md`](./00-overview.md) | This file — goals, map, phase summary |
| [`01-architecture-and-data-model.md`](./01-architecture-and-data-model.md) | Pipeline phases, Convex schema, Neon identity linking |
| [`02-research-agent-eve.md`](./02-research-agent-eve.md) | Eve agent layout, sandbox, skills, output schema, secrets |
| [`03-admin-ux-pipeline.md`](./03-admin-ux-pipeline.md) | Series selector, phase views, idea review UX |
| [`04-convex-orchestration.md`](./04-convex-orchestration.md) | Run lifecycle, locking, retries, Eve ↔ Convex bridge |
| [`05-implementation-phases.md`](./05-implementation-phases.md) | Ordered build phases with acceptance criteria |
| [`06-open-questions.md`](./06-open-questions.md) | Decisions needed from you before / during build |

## Implementation phases (summary)

See [`05-implementation-phases.md`](./05-implementation-phases.md) for detail.

1. **Foundation** — schema, validators, series scoping, empty pipeline UI shell.
2. **Neon schema docs + connectivity** — document football DB; prove read-only access.
3. **Eve research agent skeleton** — `agents/research`, sandbox bootstrap, skills, structured output.
4. **Orchestration bridge** — Convex research runs ↔ Eve session API.
5. **Idea review UX** — generate button, disable-while-running, approve/reject, interviewee toggles.
6. **Hardening** — evals, network policy, idempotency, observability, cost controls.
7. **(Later)** Contact / interview / writer phases as separate agents.

## Key product decisions already reflected in this plan

These match your brief; call out changes in [`06-open-questions.md`](./06-open-questions.md) if you disagree.

1. **Batch size = 5** ideas per generate trigger.
2. **Idea payload** = idea title, 3 article title proposals, why interesting, max 3 people to interview, supporting facts/data.
3. **Interviewees** are Neon football people (players/staff), linked by external IDs + club/team; editor may **disable** suggested people but **not add** people manually.
4. **Series (division)** is the top-level workspace filter.
5. **Phases** are first-class and always visible on every article in the pipeline.
6. Research agent uses **sandbox code execution**, not a fixed `execute_sql` tool catalog.
7. Database access is **read-only**; never invent stats.

## Important tech corrections from Eve research

Your architecture sketch is directionally right. A few Eve-specific adjustments:

| Your sketch | Eve reality (v0.27) | Plan recommendation |
|-------------|---------------------|---------------------|
| Clone whole monorepo into sandbox every run | Prefer `bootstrap` snapshot + `sandbox/workspace/` seeds | Seed schema docs, `pg`, helper snippets; avoid full app clone |
| Inject `DATABASE_URL` into sandbox | Supported via `vercel({ env })`; Eve also prefers credential brokering for HTTP | Use env for Postgres wire protocol; lock network allow-list to Neon |
| OpenRouter as default | Eve defaults to **Vercel AI Gateway** model strings | Decide: Gateway (simpler on Vercel) vs OpenRouter `LanguageModel` |
| Folder `agents/research/` | Eve expects an `agent/` directory inside an Eve project | Package at `agents/research/` with inner `agent/` + own `package.json` / Vercel project |
| Convex “orchestrates Eve workflows” | Eve has its own Workflow durability; Convex should orchestrate **jobs + editorial state** | Convex starts/tracks runs; Eve runs research; Convex persists results |

## Neon connectivity status (this Cloud Agent)

**Not tested successfully.** Process env has no `NEON_DATABASE_URL` / `DATABASE_URL`. Cursor injected secrets currently include only `AGENT_ACCESS_SECRET` and `CONVEX_DEPLOY_KEY`.

To unblock DB smoke tests from Cloud Agents, add the same read-only Neon URL as a Cursor secret (name suggestion: `NEON_DATABASE_URL`). Vercel-only env is enough for deployed Eve, not for agent-side verification here.

## Success criteria for “Phase 1 done”

- [ ] Admin can open AI Journalist workspace and pick a reeks.
- [ ] “Genereer 5 ideeën” creates a research run; button disables until finished/failed.
- [ ] Exactly 5 structured ideas land in Convex for that series (or a clear failure state).
- [ ] Each idea shows required fields; editor can approve/reject and toggle interviewees (subset only).
- [ ] Approved idea becomes an article pipeline row in phase `awaiting_contacts` (or equivalent next phase).
- [ ] Rejected ideas are retained for audit, not deleted.
- [ ] Neon remains read-only; agent cannot invent facts (prompt + eval coverage).
- [ ] Research agent runs in isolated sandbox with restricted egress.
