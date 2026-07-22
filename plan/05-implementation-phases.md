# Implementation Phases

Ordered build plan. Each phase has a clear exit criteria. Do not start Eve/Neon integration before schema + UI shell exist.

---

## Phase A — Pipeline foundation (Convex + empty UI)

**Deliverables**

- Convex validators for phases, supporting facts, interviewees
- Tables: `researchRuns`, `editorialArticles`, `editorialEvents`
- Queries: list by `divisionKey` + phase; get article; get active run
- Mutations: stub `startResearchRun` (creates run, no Eve yet), approve/reject/toggle with phase guards
- Admin nav + `/admin/journalist` shell
- Series selector + phase strip + empty Ideeën list

**Exit criteria**

- Editor can pick reeks, see empty idea queue, click generate → run row becomes `running` then (dev stub) `succeeded` with 5 fixture ideas **or** explicitly `failed` with message
- Approve/reject/toggle work on fixture ideas

**Depends on:** none  
**Risk:** low

---

## Phase B — Neon schema documentation + connectivity proof

**Deliverables**

- Inspect Football Data Platform (Neon) schema (tables for games, players, clubs, divisions, staff)
- Write `agents/research/agent/sandbox/workspace/docs/database-schema.md` (+ relationships, common queries)
- Document `divisionKey` ↔ Neon division mapping
- Dry-run connectivity script (read-only `SELECT 1` + list tables) with `--dry-run` / execute modes per your ops rules
- Confirm Neon role is read-only (attempted write fails)

**Exit criteria**

- Schema docs accurate enough for an LLM to write useful SQL
- Connectivity proven from at least one environment (Vercel preview Eve **or** Cloud Agent with Cursor secret)

**Blocker today:** `NEON_DATABASE_URL` not available in Cursor Cloud Agent secrets (only on Vercel per you). Add Cursor secret or run proof on Vercel.

**Depends on:** access to Neon  
**Risk:** medium (unknown schema quality / naming)

---

## Phase C — Eve research agent skeleton

**Deliverables**

- `agents/research` Eve package scaffold (`eve init` adapted to monorepo)
- `instructions.md`, skills, sandbox bootstrap with `pg` + `tsx`
- IdeaBatch Zod/JSON schema + eval stubs
- Local `eve dev` can produce one structured batch against Neon (manual)
- Network allow-list for Neon
- README with env vars and deploy notes

**Exit criteria**

- Manual session returns valid 5-idea JSON for one real division
- No DB writes possible with the configured role

**Depends on:** Phase B docs + Neon URL  
**Risk:** medium (Eve beta APIs, sandbox cold start, model quality)

---

## Phase D — Orchestration bridge

**Deliverables**

- Secure Eve channel auth
- Convex `"use node"` action (or Next waiter) to start session + consume `result.completed`
- Wire `startResearchRun` to real Eve
- All-or-nothing insert of 5 ideas
- Disable generate button while run active (real statuses)
- Error surfacing in admin

**Exit criteria**

- From admin UI, one click produces 5 reviewable ideas for selected reeks
- Failure paths leave zero partial ideas and re-enable the button

**Depends on:** A + C  
**Risk:** high (timeouts, auth, stream parsing)

---

## Phase E — Idea review UX polish

**Deliverables**

- Detail view with all structured fields
- Title proposal selection on approve (if we keep it)
- Interviewee enable/disable
- Reject reason
- Phase strip counts
- Empty/error/loading states
- Basic PostHog events (optional)

**Exit criteria**

- Editor can fully triage a batch without leaving the Journalist workspace
- Approved ideas land in `awaiting_contacts` with frozen interviewee selection

**Depends on:** D  
**Risk:** low

---

## Phase F — Hardening & ops

**Deliverables**

- Evals in CI for schema + a golden Neon fixture (or recorded SQL sandbox)
- Run retention / cleanup policy
- Cost/timeouts documentation
- Observability links (Eve session id)
- Rate limits / concurrency caps
- Security review: secrets, egress, prompt injection via DB text fields

**Exit criteria**

- Preview deploy smoke checklist signed off
- Known failure modes documented in `agents/research/README.md`

**Depends on:** E  
**Risk:** medium

---

## Phase G+ — Later agents (planned, not built now)

Keep schema extension points ready; implement as separate plan updates:

1. **Contacts / WhatsApp agent** — uses `selectedInterviewees` + `neonClubId`
2. **Interview realtime agent** — stores transcripts on article id
3. **Writer graph** — drafts + critiques + fact-check
4. **Publish bridge** — Keystatic/Git or Convex→site

Each gets its own phase plan file when we start it.

---

## Suggested sequencing for the first coding PR train

1. PR1 — Phase A schema + UI shell + fixture generate  
2. PR2 — Phase B docs + connectivity script  
3. PR3 — Phase C Eve agent (may be same PR as B if small)  
4. PR4 — Phase D bridge  
5. PR5 — Phase E polish + Phase F checklist

---

## Definition of Done (Research agent MVP)

Matches [`00-overview.md`](./00-overview.md) success criteria: series-scoped workspace, generate-5 with lock, structured idea review, approve → next phase, Neon read-only, no invented facts (prompt + eval).
