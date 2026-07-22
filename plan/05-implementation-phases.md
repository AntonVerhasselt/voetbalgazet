# Implementation Phases (detailed)

---

## Phase A — Pipeline foundation + fixtures

**Yes, do fixtures (`Q15`).**

Deliverables:

- Schema: `pipelineResearchRuns`, `pipelineArticles`, `pipelineEvents`, `contacts`, `pipelineArticleContacts`  
- Validators + phase guards  
- Queries excluding rejected by default  
- Mutations: start (fixture path), approve, reject, toggle contact selected  
- UI: `/admin/pipeline`, reeks selector, phase strip, ideeen list/detail  
- Fixture generator: 5 Dutch-ish sample ideas + sample contacts  

Exit:

- Generate → 5 fixtures; button locks per reeks  
- Approve with 0 contacts; reject hides from list  
- All 3 titles visible after approve  

See [`10-fixture-ideas-and-phase-a.md`](./10-fixture-ideas-and-phase-a.md).

---

## Phase B — Neon docs + taxonomy plan

Next Cloud Agent session (Neon secret available):

- Connectivity smoke (read-only)  
- Introspect schema → write `database-schema.md`, relationships, common queries  
- Propose Neon-aligned `divisionKey` scheme  
- Dry-run taxonomy migration script (no execute without confirmation)  

---

## Phase C — `articleArchive` + sync

- Table + Markdoc→Convex sync script (`--dry-run` first)  
- Indexes / query helpers  

---

## Phase D — Eve agent skeleton

- Scaffold `apps/agents/research-idea-agent`  
- Dutch instructions/skills  
- Sandbox + Neon  
- Model `zai/glm-5.2`  
- Archive tools calling Convex  
- Manual Eve session produces valid IdeaBatch  

---

## Phase E — Orchestration bridge

- Replace fixture path with Eve waiter  
- Per-reeks lock; all-or-nothing ingest + contact upsert  
- Error UX  

---

## Phase F — Review polish + hardening

- Empty/error states, rejected bin optional  
- Evals (shape, Dutch, archive tool called)  
- Network policy, secrets audit, timeouts  

---

## Phase G+ — Later agents

WhatsApp contacts → interview → writer → publish.

---

## Suggested PRs

1. Phase A  
2. Phase B (+ C if small)  
3. Phase D agent  
4. Phase E bridge  
5. Phase F  
