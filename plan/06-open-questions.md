# Open Questions & Decisions Log

All planning questions for the idea-agent MVP are decided.

---

## Fully decided

| ID | Decision |
|----|----------|
| **Q1** | Neon URL available next Cloud Agent session → create schema docs then |
| **Q2** | Next session: introspect Neon + author curated docs |
| **Q3** | Neon is football source of truth; adapt Convex taxonomy to Neon keys |
| **Q4** | **Article archive search = out of scope** for this phase (removed from plans) |
| **Q5** | Approve with **0 interviewees** allowed |
| **Q6** | Keep **all 3 title proposals**; real title later |
| **Q7** | Keep rejected in DB; **filter out of default UI** |
| **Q8** | **Code English**; **everything sent to the agent + agent prose output = Dutch** |
| **Q9** | Generate **5 ideas for the currently selected reeks only** |
| **Q10** | **Block generate only for that division**; other reeksen stay available |
| **Q11** | Vercel AI Gateway; open-weight model **`zai/glm-5.2`** |
| **Q12** | `apps/agents/research-idea-agent` + own Vercel project |
| **Q13** | OK to use Next/Fluid waiter |
| **Q14** | Nav **Pipeline**, routes `/admin/pipeline/*` |
| **Q15** | **Yes** — Phase A uses fixture ideas |
| **Q16** | First-class contacts with Neon club/team ids+names, types, notes — [`08`](./08-contacts-data-model.md) |
| **Q17** | All players OK to interview |
| **Q18** | Person dedupe via `neonPersonId`. Story-angle dedupe vs published articles deferred (out of scope) |
| **Q19** | Model: **`zai/glm-5.2`** |
| **Q20** | Manual generate only for now |
| **Q21** | Full batch of 5 only |

---

## Q4 — out of scope

Published-site article search (tools, Convex index, sitemap/curl) is **removed from the MVP plan**. The idea agent researches Neon only. Archive/dedupe can be redesigned later when we have a clearer editorial need.

---

## Q8 — language clarification

- **Repository / TypeScript / Convex field names / JSON keys / tool filenames:** English.  
- **Prompts and model-facing metadata** (`instructions.md`, skill text, tool descriptions, Zod describes, orchestrator task message): Dutch.  
- **Agent output string values** (titles, facts, whyInteresting, …): Dutch.  

---

## Q10 — concurrency

Only the generate trigger for the **busy division** is disabled. Other divisions can still start research runs.

---

## Q19 — model

**`zai/glm-5.2`** via AI Gateway (MIT open-weight, agentic/coding-oriented). Changeable in `agent/agent.ts`.
