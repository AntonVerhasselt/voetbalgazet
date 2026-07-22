# Open Questions & Decisions Log

Status of decisions for the AI journalist plan. Answered items are locked unless you reopen them.

---

## Decided

### Q1 — Neon access for Cloud Agents → **You added the URL**
**Status:** Still **not injected into this Cloud Agent session**.  
`CLOUD_AGENT_ALL_SECRET_NAMES` currently lists only `AGENT_ACCESS_SECRET` and `CONVEX_DEPLOY_KEY`. `NEON_DATABASE_URL` is unset in process env.

Likely causes:
1. Secret was added on **Vercel** but not as a **Cursor Cloud Agent** secret for this environment.
2. Secret was added to Cursor after this run started (new secrets usually need a **new agent run**).
3. Different name than `NEON_DATABASE_URL`.

**Action for you:** In Cursor → Cloud Agents → this environment’s secrets, add `NEON_DATABASE_URL` (read-only Neon URL), then start a new agent turn/run so we can smoke-test.

### Q3 — Division / football keys → **Neon is source of truth**
Placeholder Convex/YAML division & team keys (`antwerpen-p1`, etc.) are temporary. We will **adapt Convex taxonomy to match Neon** once schema is inspected. Neon owns football naming and IDs; the app catalog follows.

### Q4 — Article archive → **Recommendation locked (see below)**
Articles today live only in Git (Markdoc). See “Archive recommendation” in this file and [`02-research-agent-eve.md`](./02-research-agent-eve.md).

### Q5 — Approve with 0 interviewees → **Allowed**
Editor may approve an idea with zero selected interviewees. Interview is optional at idea stage.

### Q11 — Model routing → **AI Gateway (default), cheaper models OK**
Yes: AI Gateway exposes many open/cheaper models at provider list price (no markup). Keep Eve on AI Gateway; pick a cost-efficient model id. Details in “AI Gateway & cheaper models” below.

### Q12 — Eve deployment → **Monorepo + own Vercel project**
Path: `apps/agents/research-idea-agent/` (Eve project root), linked to its **own Vercel project**. Not embedded inside `apps/web`.

### Q14 — Naming → **Chosen by plan**
| Surface | Name |
|---------|------|
| Admin nav | Pipeline |
| Routes | `/admin/pipeline`, `/admin/pipeline/ideeen`, `/admin/pipeline/[articleId]` |
| Eve package | `apps/agents/research-idea-agent` |
| Convex module prefix | `pipeline*` / tables `pipelineArticles`, `pipelineResearchRuns`, … |

### Q15 — Fixture ideas → **Explained; OK for Phase A**
**Fixture ideas** = fake but schema-valid idea objects inserted by a stub generate path so we can build/test the admin UI (list, detail, approve, reject, toggles) **before** Eve + Neon are wired. Not production content. Phase A uses fixtures; Phase D replaces the stub with real Eve results.

---

## Archive recommendation (answered Q4)

### Options researched

| Option | How it works | Pros | Cons |
|--------|--------------|------|------|
| **A. Prompt context from Convex** | On each research run, Convex packs recent published headlines + pipeline idea titles for that series into the Eve message | Simple; no new store; works with Git Markdoc via a sync or build-time index | Weak “search”; limited history unless we sync aggressively |
| **B. Seed archive index into sandbox** | Generate `archive-index.json` (slug, title, dek, division keys, date) from Markdoc; seed into Eve `sandbox/workspace/` | Agent can `grep`/filter locally; good for MVP size (~dozens of articles) | Must regenerate when articles change; full-text of bodies optional/heavy |
| **C. Sync published articles into Neon** | Football DB gains an `articles` (or archive) table | Agent searches archive with SQL like stats; one DB | Cross-project migration; articles aren’t in Neon today; couples CMS to data platform |
| **D. Dedicated archive API** | HTTP search over Git/CMS | Clean boundary | Extra service to build/operate for little gain now |

### Recommendation

**MVP (Phase C–D): A + B**

1. **Convex packs** into the Eve task message:
   - last N pipeline idea titles for the series (pending/approved/rejected)
   - last N **published** site article titles/slugs/deks for that series
2. **Build a small archive index** from `apps/web/content/articles/*.mdoc` (titles, slugs, division keys, dates, dek) and seed it into the research agent sandbox as `docs/archive-index.json` (and optionally short excerpts).

**Later (optional):** When the Football Data Platform wants a durable archive, sync published articles into Neon (option C) and teach the agent to SQL-search them. Not required for idea-agent MVP.

**Do not** clone the whole Git monorepo into every sandbox only for archive access.

---

## AI Gateway & cheaper models (answered Q11)

**Yes — you can use cheaper / open models via AI Gateway.**

- Eve model strings like `"alibaba/qwen3.7-plus"` or `"nvidia/nemotron-3-ultra-550b-a55b"` route through AI Gateway.
- Pricing is **provider list price, zero markup** ([AI Gateway pricing](https://vercel.com/docs/ai-gateway/pricing)).
- Catalog includes low-cost text models (examples from the public model browser: Qwen, Nemotron, GLM, MiniMax, some free-tier models). Exact ids/prices change — pick from [vercel.com/ai-gateway/models](https://vercel.com/ai-gateway/models).
- Free tier has a subset of models + lower rate limits; paid credits unlock the full catalog.

**OpenRouter is not required** for “cheaper models.” Use OpenRouter only if you need a model/provider Gateway doesn’t offer, or existing OpenRouter billing.

**MVP default:** AI Gateway + a mid/cheap model suitable for tool-using research (validate with one eval run). Upgrade model if idea quality is weak.

---

## Still open — please answer

### Q2 — Neon schema docs source
Curated markdown in-repo (refreshed by script) vs live `information_schema` discovery every session?  
**Lean recommendation:** curated docs + script refresh; allow live introspect as fallback.

### Q6 — Title selection on approve
Must editor pick 1 of 3 titles on approve, or keep all 3 until writing?

### Q7 — Rejected ideas visibility
Default list = only `idea_review`, rejected behind a filter? Or show rejected inline?

### Q8 — Language
Confirm idea copy (titles, why interesting, facts prose) is **Dutch (Flemish)**?

### Q9 — Series scope of generate
Confirm: generate only for the **currently selected reeks** (no multi-reeks batch in MVP)?

### Q10 — Concurrent runs
One running job **per reeks** (parallel across reeksen OK), or global single-flight?

### Q13 — Long-run waiter
If Eve research exceeds Convex action limits, OK to wait in a Next/Fluid route that writes back to Convex?

### Q16 — People data
OK to store Neon player/staff names + club labels in Convex for admin pipeline?

### Q17 — Minors / youth
Any rule to avoid suggesting youth/minors as interviewees?

### Q18 — Duplicate threshold
How hard should “too similar to past article” be? (e.g. same player+angle within 30 days)

### Q19 — Quality vs cost
Prefer cheaper/faster for MVP iteration, or stronger/slower from day one?

### Q20 — Auto-schedule
Manual trigger only for now, or daily/weekly soon after MVP?

### Q21 — Partial regenerate
Only full batches of 5, or later “regenerate replacements” for weak ideas?

---

## How to answer

Reply with e.g. `Q6: pick on approve`, `Q8: yes Dutch`, `Q10: per reeks`. I’ll update the plans again and proceed to implementation when you’re ready.
