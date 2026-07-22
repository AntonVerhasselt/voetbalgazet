# Open Questions & Decisions Log

Complete decision log for the AI journalist / Pipeline plans.

---

## Fully decided

| ID | Decision |
|----|----------|
| **Q1** | Neon URL will be available next Cloud Agent session → create schema docs then |
| **Q2** | Next session: introspect Neon + author curated docs in the agent workspace |
| **Q3** | Neon is football source of truth; adapt Convex taxonomy to Neon keys |
| **Q4** | **Archive via Eve tools + Convex `articleArchive` index** (not static JSON dump). Optional sitemap tool as secondary. See [`07-article-archive-tools.md`](./07-article-archive-tools.md) |
| **Q5** | Approve with **0 interviewees** allowed |
| **Q6** | Keep **all 3 title proposals**; real title chosen after interviews/writing |
| **Q7** | Keep rejected in DB; **filter out of default UI** |
| **Q8** | **Everything from the agent in Dutch**: instructions, tool descriptions, skills, output fields’ content |
| **Q9** | Generate **5 ideas for the currently selected reeks only** |
| **Q11** | Vercel AI Gateway; open-weight model **`zai/glm-5.2`** (see below) |
| **Q12** | `apps/agents/research-idea-agent` + own Vercel project |
| **Q13** | OK to use Next/Fluid waiter (not only Convex actions) |
| **Q14** | Nav **Pipeline**, routes `/admin/pipeline/*` |
| **Q15** | **Yes** — Phase A uses fixture ideas |
| **Q16** | Store contacts properly with Neon club/team ids+names, types, notes field (unused in UI yet). See [`08-contacts-data-model.md`](./08-contacts-data-model.md) |
| **Q17** | All players OK to interview (including youth) |
| **Q18** | Neon ids dedupe **people**; archive tools dedupe **story angles** |
| **Q19** | Model: **`zai/glm-5.2`** (changeable later) |
| **Q20** | Manual generate only for now; schedules later |
| **Q21** | Full batch of 5 only (no partial regenerate) |

---

## Q10 explained (concurrency)

**What it meant:** When an editor clicks “Genereer 5 ideeën”, we start a research job. Should the system allow:

- **A) Per-reeks lock:** At most one running job for *Antwerpen P1*, but Limburg P2 can run at the same time.  
- **B) Global lock:** Only one research job anywhere in the whole app.

**Recommendation (locked unless you object):** **A — per-reeks lock.**  
Rationale: different series are independent; parallel runs cost more but unblock other editors/reeks. UI disables the button only for the **selected** reeks that already has a `queued|running` run.

---

## Q4 archive — revised answer

You rejected the “dump JSON in the sandbox” approach. Agreed.

**Chosen design:** searchable **Convex `articleArchive`** + Dutch Eve tools (`zoek_gepubliceerde_artikelen`, …). Sitemap/`curl` is an optional secondary freshness check, not the primary search. Full detail in [`07-article-archive-tools.md`](./07-article-archive-tools.md).

---

## Q19 — model picked

**`zai/glm-5.2`** via AI Gateway.

- MIT **open-weight** model aimed at long-horizon coding / agentic work  
- Large context (good for multi-step sandbox research)  
- Tool calling + structured output supported on Gateway  
- Roughly ~$0.90 / $2.84 per 1M input/output tokens (verify live catalog)  
- Cheaper sibling later if needed: `zai/glm-5.2-fast`

Change anytime in `agent/agent.ts`.

---

## Nothing blocking left

All product/architecture questions for Phase A–D planning are answered. Remaining work is implementation + Neon introspection next session.

Optional fine-tuning later (not blocking):

- Exact “story angle duplicate” day window (soft 60d in instructions for now)  
- Whether `articleArchive.bodyText` is always synced or on-demand  
- Global concurrency cap for cost control (e.g. max 3 Eve sessions app-wide)
