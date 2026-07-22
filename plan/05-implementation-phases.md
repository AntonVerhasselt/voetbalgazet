# Implementation Phases

---

## Phase A — Pipeline foundation + fixtures

**Yes, fixtures (`Q15`).**

Deliverables:

- Schema: `pipelineResearchRuns`, `pipelineArticles`, `pipelineEvents`, `contacts`, `pipelineArticleContacts`  
- Validators + phase guards  
- Queries excluding rejected by default  
- Mutations: start (fixture path), approve, reject, toggle contact selected  
- UI: `/admin/pipeline`, reeks selector, phase strip, ideeen list/detail  
- Fixture generator: 5 Dutch sample ideas + sample contacts  
- Per-division generate lock only  

Exit:

- Generate → 5 fixtures; button locks **only that reeks**  
- Approve with 0 contacts; reject hides from list  
- All 3 titles visible after approve  

See [`10-fixture-ideas-and-phase-a.md`](./10-fixture-ideas-and-phase-a.md).

---

## Phase B — Neon docs + taxonomy plan

Next Cloud Agent session (Neon secret available):

- Connectivity smoke (read-only)  
- Introspect schema → write docs under agent sandbox workspace  
- Propose Neon-aligned `divisionKey` scheme  
- Dry-run taxonomy migration script (no execute without confirmation)  

---

## Phase C — Eve agent skeleton

- Scaffold `apps/agents/research-idea-agent`  
- Dutch instructions/skills/tool descriptions; English code  
- Sandbox + Neon  
- Model `zai/glm-5.2`  
- Manual Eve session produces valid IdeaBatch  

**Not in this phase:** article-archive search tools.

---

## Phase D — Orchestration bridge

- Replace fixture path with Eve waiter  
- Per-division lock; all-or-nothing ingest + contact upsert  
- Error UX  

---

## Phase E — Review polish + hardening

- Empty/error states  
- Evals (shape, Dutch content)  
- Network policy, secrets audit, timeouts  

---

## Phase F+ — Later

- WhatsApp / interview / writer / publish  
- **Optional later:** published-article archive search for story-angle dedupe  
- **TODO — full Neon series map:** wait for Anton to supply Neon `series.id` for every reeks, then extend `neonSeriesMap` only (public keys stay readable — never `CHP_*` in UI) — see [`06-open-questions.md`](./06-open-questions.md)  

---

## Suggested PRs

1. Phase A  
2. Phase B  
3. Phase C agent  
4. Phase D bridge  
5. Phase E  
