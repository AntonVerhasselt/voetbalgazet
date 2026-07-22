# Implementation Phases

Ordered build plan. Each phase has clear exit criteria.

---

## Phase A — Pipeline foundation (Convex + UI + fixtures)

**Deliverables**

- Validators for phases, facts, interviewees  
- Tables: `pipelineResearchRuns`, `pipelineArticles`, `pipelineEvents`  
- Queries/mutations: list by division+phase, get article, active run, approve/reject/toggle  
- Stub `startResearchRun` → inserts **5 fixture ideas** (no Eve)  
- Admin nav **Pipeline** + `/admin/pipeline` shell  
- Series selector + phase strip + Ideeën list/detail  

**Exit criteria**

- Pick reeks → generate → 5 fixtures appear; button disabled while “running”  
- Approve (including 0 interviewees) / reject / toggles work  

**Depends on:** none  
**Risk:** low  

---

## Phase B — Neon connectivity + taxonomy realignment

**Deliverables**

- Prove read-only Neon from Cloud Agent (needs Cursor secret) or documented Vercel smoke  
- Introspect schema; write docs under `apps/agents/research-idea-agent/agent/sandbox/workspace/docs/`  
- Define Neon-aligned series/club keys  
- Plan + dry-run migration to adapt Convex `divisions`/`teams` (and preference catalog) from placeholders → Neon  
- Confirm write attempts fail on Neon role  

**Exit criteria**

- Schema docs usable by the LLM  
- Connectivity proven  
- Taxonomy migration plan reviewed (execute only after your confirmation per dry-run rules)  

**Blocker:** `NEON_DATABASE_URL` not yet injected into this agent session — add Cursor Cloud secret + new run.  

**Depends on:** Neon access  
**Risk:** medium–high (subscriber preference key migration)  

---

## Phase C — Eve research-idea-agent skeleton

**Deliverables**

- Scaffold `apps/agents/research-idea-agent`  
- Instructions, skills, sandbox bootstrap (`pg`, `tsx`)  
- `archive-index.json` generator from Markdoc  
- IdeaBatch schema + eval stubs  
- AI Gateway model string (cheap/mid)  
- Own Vercel project linked; README  

**Exit criteria**

- Manual `eve dev` / deployed session returns valid 5-idea JSON for one real series  
- Read-only Neon enforced  

**Depends on:** Phase B docs + Neon URL  
**Risk:** medium  

---

## Phase D — Orchestration bridge

**Deliverables**

- Secure Eve invoke from Convex (or Next waiter)  
- Replace fixture stub with real Eve for generate  
- All-or-nothing insert; button lock; errors in UI  

**Exit criteria**

- One admin click → 5 real reviewable ideas for selected reeks  

**Depends on:** A + C  
**Risk:** high (timeouts, auth, streams)  

---

## Phase E — Idea review UX polish

**Deliverables**

- Detail polish, reject reasons, phase counts, empty/error states  
- Optional PostHog events  
- Resolve remaining UX open questions (`Q6`, `Q7`)  

**Exit criteria**

- Full triage in Pipeline without leaving the workspace  

**Depends on:** D  
**Risk:** low  

---

## Phase F — Hardening & ops

**Deliverables**

- Evals, retention, cost/timeout docs, concurrency caps, security pass  

**Exit criteria**

- Preview smoke checklist done; failure modes documented in agent README  

**Depends on:** E  
**Risk:** medium  

---

## Phase G+ — Later agents

Contacts/WhatsApp → interview → writer → publish. Separate plan updates when started.

---

## PR train (suggested)

1. Phase A — schema + Pipeline UI + fixtures  
2. Phase B — Neon docs + taxonomy dry-run  
3. Phase C — Eve agent  
4. Phase D — bridge  
5. Phase E/F — polish + hardening  

---

## Definition of Done (idea-agent MVP)

See [`00-overview.md`](./00-overview.md) success criteria.
