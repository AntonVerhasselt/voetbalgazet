# Open Questions

Please answer these so implementation doesn’t guess wrong. Grouped by urgency.

## Blockers for Phase B/C (answer first)

### Q1 — Neon access for Cloud Agents
You added `NEON_DATABASE_URL` to **Vercel** env vars. It is **not** available in this Cursor Cloud Agent environment, so we could not test connectivity from here.

**Options:**
- A) Add the same read-only URL as a Cursor Cloud secret named `NEON_DATABASE_URL`
- B) You run / approve a Vercel-side smoke test later
- C) Share a redacted schema dump / `information_schema` export in-repo

**Which do you prefer?**

### Q2 — Neon schema source of truth
Is there a separate Football Data Platform repo/docs we should pull schema from, or should the research agent discover schema live via SQL (`information_schema` / introspect) every session?

**Recommendation:** commit curated markdown docs, refresh via a script when Neon schema changes.

### Q3 — Division mapping
App series keys look like `antwerpen-p1`. What is the corresponding identifier in Neon (competition id, slug, name)? Do you already have a mapping table?

### Q4 — Article archive location
Where should the agent search for prior articles?
- Neon archive tables?
- Public site / Markdoc in Git?
- Separate HTTP API?

## Product decisions (Phase A/E)

### Q5 — Approve without interviewees?
If the editor disables all 3 suggested people, can they still approve the idea (interview optional), or is ≥1 interviewee required?

### Q6 — Title selection
On approve, must the editor pick one of the 3 title proposals, or do we keep all 3 and decide later during writing?

### Q7 — Rejected ideas visibility
Default Ideeën view = only `idea_review`, with Afgewezen in a filter? Or show rejected inline?

### Q8 — Language
Confirm all idea fields (titles, why interesting, facts) must be **Dutch (Flemish)**. Evidence numbers can stay numeric.

### Q9 — Series scope of generate
Generate always for the **currently selected reeks** only (recommended). Any need for “all reeksen” batch jobs in MVP?

### Q10 — Concurrent runs
OK to allow one running research job **per reeks**, multiple reeksen in parallel? Or global single-flight?

## Architecture decisions

### Q11 — Model routing
Your brief says OpenRouter. Eve defaults to Vercel AI Gateway.

**Prefer for MVP:**
- A) AI Gateway (simpler on Vercel)
- B) OpenRouter via AI SDK provider
- C) Gateway now, OpenRouter later

### Q12 — Eve deployment
**Prefer:**
- A) Separate Vercel project at `agents/research` (recommended)
- B) Embed Eve into `apps/web` via `eve/next`

### Q13 — Long-run waiter
If research exceeds Convex action limits, OK to put the Eve stream waiter in a Next.js/Fluid route that writes back to Convex?

### Q14 — Workspace naming
Nav/route name preference:
- A) `/admin/journalist`
- B) `/admin/pipeline`
- C) `/admin/ai`
- D) other: ___

### Q15 — Fixture vs wait
For the first UI PR, OK to ship fixture ideas (no Eve) behind the generate button until the bridge is ready?

## Editorial / legal

### Q16 — People data
Are Neon player/staff names OK to store in Convex and show in admin? Any retention or minimization constraints beyond “editorial use”?

### Q17 — Interview consent
Any copy/rules the idea agent should respect when suggesting interviewees (e.g. minors/youth players)?

### Q18 — Duplicate threshold
How similar to a past article is “too duplicate”? Same player+angle within N days? Same club story weekly?

## Nice-to-know (non-blocking)

### Q19 — Target model quality vs cost
Prefer stronger/slower model for research, or cheaper/faster for MVP iteration?

### Q20 — Auto-schedule
Should daily/weekly auto-generation be in scope soon after MVP, or strictly manual trigger?

### Q21 — Multi-idea regenerate
If 2/5 ideas are good, do editors want “regenerate replacements” or only full new batches of 5?

---

## How to answer

Reply with `Q1: A`, `Q5: require ≥1`, etc. I’ll update the plan files and then start Phase A implementation unless you want a different phase order.
