# Pipeline data structure explained

How research ideas are stored, how they connect to the Neon football database, how contacts fit in, and how an idea is meant to become a published article.

**Audience:** editors and product owners (especially Anton).  
**Code sources of truth:** `convex/schema.ts`, `convex/lib/neonSeriesMap.ts`, `plan/01-architecture-and-data-model.md`, `plan/08-contacts-data-model.md`.

---

## 1. Big picture

We run an **AI journalist pipeline** in Convex. It is separate from the public Markdoc/Keystatic articles on the website.

```text
Neon football DB  ──(SQL research)──►  Eve research agent
                                              │
                                         IdeaBatch JSON
                                              │
                                              ▼
                                         Convex ingest
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
           pipelineArticles            contacts (people)      pipelineArticleContacts
           (story ideas)               (canonical person)     (this person ↔ this idea)
                    │
                    ▼
              Editor review (/admin/pipeline)
                    │
         approve ───┴─── reject
            │
            ▼
     later phases (outreach → interview → draft → publish)
            │
            ▼
     (future) Keystatic / published article on the site
```

**Today (implemented):** research → 5 ideas → editor review (notes, questions, select interviewees) → approve or reject.  
**Later (schema ready, product not built yet):** WhatsApp outreach, interviews, writing, publish bridge to Keystatic.

---

## 2. Two databases, two jobs

| System | What it is | What we use it for |
|--------|------------|--------------------|
| **Neon (voetbaldatabase)** | External Postgres football data (series, clubs, teams, persons, matches, rankings, …) | Facts and people for research. The agent queries it with SQL. |
| **Convex** | Our app backend (pipeline, contacts, auth, newsletter prefs, …) | Store ideas, editorial decisions, contact channels, and pipeline state. |

Neon is the **source of football truth**. Convex is the **editorial workflow** and the place we remember “we already know this person’s WhatsApp.”

We do **not** copy the whole Neon schema into Convex. We only store what the newsroom needs: ideas, people we might interview, and how those people sit on a given idea.

---

## 3. Public keys vs Neon ids (reeks / series)

This is the most important mapping rule.

### User-facing (always readable)

Everywhere in the product we use **kebab-case reeks keys**, for example:

- `antwerpen-p1`
- `antwerpen-p2a`
- `antwerpen-bva-g1`

These appear in:

- Pipeline UI (`divisionKey`)
- Signup / preference catalog (`divisions.externalKey`)
- YAML / Keystatic taxonomy where relevant

**Never** show Neon ids like `CHP_130005` as the product key.

### Neon-only (mapping for SQL)

Neon’s competition series use ids such as `CHP_130005`. Those are mapped in:

`convex/lib/neonSeriesMap.ts` → `KNOWN_NEON_SERIES`

Example seed (Antwerp):

| Public key | Neon `series.id` | Label (approx.) |
|------------|------------------|-----------------|
| `antwerpen-p1` | `CHP_130005` | 1 Provinciaal Antw |
| `antwerpen-p2a` | `CHP_136335` | 2 Provinciaal Antw A |
| `antwerpen-bva-g1` | `CHP_134688` | BvA Heren Groep 1 |

When the agent researches a reeks, Convex injects the Neon series id into the task prompt via `neonSeriesIdForDivision(publicKey)`. The agent then filters SQL on that `series.id`.

Until every reeks is mapped, unmapped reeksen still have a readable public key; the agent may need to look up `series.id` itself.

---

## 4. Convex tables (pipeline)

### 4.1 `pipelineResearchRuns`

One **generate** click (or API call) for a reeks.

| Field | Meaning |
|-------|---------|
| `divisionKey` | Public reeks key |
| `status` | `queued` → `running` → `succeeded` / `failed` / `cancelled` |
| `source` | `fixture` (dev stub) or `eve` (real agent) |
| `requestedCount` | Always **5** ideas |
| `ideaIds` | The five `pipelineArticles` created on success |
| `clientRequestId` | Idempotency |

Research progress lives here — **not** as an article phase.

### 4.2 `pipelineArticles`

One **story idea** (and later the same row may represent the piece as it moves toward publish).

Important fields:

| Field | Meaning |
|-------|---------|
| `divisionKey` | Which reeks this idea belongs to |
| `phase` | Where it is in the workflow (see §7) |
| `researchRunId` | Which generate run created it |
| `ideaTitle` | Working title |
| `titleProposals` | Exactly **3** headline options (all kept on approve) |
| `finalTitle` | Optional; filled later when writing/publishing |
| `whyInteresting` | Why this is a story |
| `supportingFacts[]` | Claims + evidence; `source` is `"neon"` or `"convex"` |
| `researchSummary` | Optional longer research note |

### 4.3 `contacts`

A **canonical person** we might interview again later.

Identity key: **`neonPersonId`** (unique) = Neon `persons.id`.

Also stores:

- Name, type (`player` / `staff` / `board` / `other`), optional detail (`T1-trainer`, …)
- Club / team Neon ids + display names (denormalized snapshot)
- `divisionKeys` — reeksen where we’ve seen them
- Channel fields for later outreach: `phoneE164`, `email`, `whatsappJid`, `preferredChannel`
- `notes` — **general** CRM-style notes on the person (not the per-idea interviewer briefing)
- `source` — `research_agent` | `whatsapp_agent` | `manual` | `import`

**Upsert rule:** if the same `neonPersonId` appears again, refresh football metadata; **do not wipe** phone/email/WhatsApp/`notes`.

There is **no** Convex `clubs` table for football clubs. Club identity stays in Neon; we only denormalize on the contact.

### 4.4 `pipelineArticleContacts` (the join)

This is “**this person, for this idea**.”

| Field | Meaning |
|-------|---------|
| `articleId` | The idea |
| `contactId` | Link to `contacts` |
| `neonPersonId` | Denormalized for easy querying |
| `whyInterview` | Short: why this person for this story |
| `interviewerNotes` | Longer briefing for the interviewer: who / why / goal of the conversation |
| `questions` | Ordered list of Dutch interview questions (agent suggests 1–8; editor can edit/reorder) |
| `suggestedOrder` | Agent ranking (0–2) |
| `selected` | Editor toggle: interview this person or not (default `true`) |

So:

- **Person identity & channels** → `contacts`
- **Story-specific interview plan** → `pipelineArticleContacts`

One contact can appear on many ideas over time. Each idea keeps its own notes, questions, and selection.

### 4.5 `pipelineEvents`

Audit log: research started/succeeded/failed, idea created, approved/rejected, questions/notes updated, phase changes, etc.

### 4.6 `pipelineDivisionLocks`

Per-reeks mutex so two “Generate” clicks don’t race.

---

## 5. How Neon entities map into ideas and contacts

Neon (simplified):

```text
series (CHP_*)
  └── series_teams → teams → clubs
persons
  ├── team_players  → contactType: player
  └── team_staff    → contactType: staff
matches / rankings / events → supportingFacts
```

When the agent proposes an interviewee, IdeaBatch carries Neon ids:

| IdeaBatch field | Neon origin |
|-----------------|-------------|
| `neonPersonId` | `persons.id` |
| `neonClubId` / `clubName` | club of the relevant team |
| `neonTeamId` / `teamName` | team in that series |
| `contactType` | from player vs staff (or board/other if evidenced) |

Ingest then:

1. Upserts `contacts` by `neonPersonId`
2. Inserts `pipelineArticleContacts` with `whyInterview`, `interviewerNotes`, `questions`, `suggestedOrder`, `selected: true`

Supporting facts usually cite Neon evidence (`source: "neon"`, optional `sqlFingerprint`).

Fixture mode uses fake Neon person ids prefixed with `fixture:` so they never collide with real people.

---

## 6. What the agent returns (IdeaBatch)

Exactly **5** ideas. English JSON keys; **Dutch** string values.

Per idea:

```text
ideaTitle
titleProposals[3]
whyInteresting
supportingFacts[1..8]   { claim, evidence, source, sqlFingerprint? }
interviewees[0..3]
researchSummary?
```

Per interviewee:

```text
neonPersonId, fullName
contactType (+ optional contactTypeDetail)
neonClubId, clubName
neonTeamId?, teamName?
whyInterview
interviewerNotes     ← briefing for the interviewer
questions[1..8]      ← interview questions (order matters)
```

Validation lives in:

- Agent: `apps/agents/research-idea-agent/agent/lib/idea-batch.ts`
- Convex: `convex/lib/pipelineIdeaBatch.ts`

Ingest is **all-or-nothing**: if validation fails, no partial batch is written.

---

## 7. How an idea moves through the pipeline

### Phase list (on `pipelineArticles.phase`)

```text
idea_review
    → awaiting_contacts
        → interview_scheduling → interview_ready → interviewing → interview_complete
            → drafting → draft_review → ready_to_publish → published

idea_review / later → rejected   (terminal; hidden from default Ideeën list)
almost anywhere → failed         (can return to idea_review)
```

Admin UI buckets:

| Tab | Phases |
|-----|--------|
| Ideeën | `idea_review` |
| Contacten | `awaiting_contacts` |
| Interviews | scheduling / ready / interviewing / complete |
| Drafts | drafting / draft_review |
| Publicatie | ready_to_publish / published |

### Implemented flow today

1. Editor opens `/admin/pipeline`, picks a reeks (`antwerpen-p1`, …).
2. Clicks generate → `pipelineResearchRuns` + lock.
3. **Fixture** or **Eve** produces IdeaBatch → ingest → **5** rows in `idea_review`, each with up to 3 contacts + questions + notes.
4. Editor reviews:
   - Toggle **Interviewen / Niet interviewen** (`selected`)
   - Edit **interviewerNotes**
   - Add / edit / reorder / delete **questions**
5. **Approve** → phase `awaiting_contacts` (0 selected contacts is allowed).
6. **Reject** → phase `rejected` (kept in DB for audit, not in the default list).

### Planned flow after approve (not fully built)

```text
awaiting_contacts
  → find / confirm phone or WhatsApp (contacts + future contactLeads)
  → interview_scheduling / interview_ready
  → interviewing (conversation captured)
  → interview_complete
  → drafting (writer agent or human)
  → draft_review
  → ready_to_publish
  → published
```

### Published articles on the website

Public articles are **Keystatic / Git Markdoc**, not automatic Convex rows.

Today there is **no** automatic bridge `pipelineArticles` → Keystatic. Publish is a later phase: when ready, a human or a controlled publish step will create/update the Markdoc article and mark the pipeline row `published`.

So: **pipeline = editorial production line**; **Keystatic = public CMS**. They meet at the end, not at the start.

---

## 8. Mental model: one diagram

```text
                    Neon series CHP_*  ←── neonSeriesMap ──→  public key antwerpen-p1
                              │
                         agent SQL
                              │
                         IdeaBatch
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
  pipelineArticles                         contacts
  (the story)                              (the person)
          │                                       │
          └──────── pipelineArticleContacts ──────┘
                   whyInterview
                   interviewerNotes
                   questions[]
                   selected
```

---

## 9. Related docs

| Doc | Topic |
|-----|--------|
| [`00-overview.md`](./00-overview.md) | Locked decisions |
| [`01-architecture-and-data-model.md`](./01-architecture-and-data-model.md) | Architecture detail |
| [`02-research-agent-eve.md`](./02-research-agent-eve.md) | Eve agent |
| [`03-admin-ux-pipeline.md`](./03-admin-ux-pipeline.md) | Admin UX |
| [`04-convex-orchestration.md`](./04-convex-orchestration.md) | Runs & locks |
| [`05-implementation-phases.md`](./05-implementation-phases.md) | Build order |
| [`06-open-questions.md`](./06-open-questions.md) | Decision log + Neon map TODO |
| [`08-contacts-data-model.md`](./08-contacts-data-model.md) | Contacts design |
| [`09-dutch-agent-conventions.md`](./09-dutch-agent-conventions.md) | English code / Dutch agent I/O |
| Root [`TODO.md`](../TODO.md) | Site / ops launch todos |

---

## 10. Your todos (Anton)

### A. Pipeline / research (blocking real agent coverage)

- [ ] **Supply Neon `series.id` for all remaining reeksen** (today only Antwerp seed is mapped: `CHP_130005`, `CHP_136335`, `CHP_134688`).  
  Then we only extend `KNOWN_NEON_SERIES` in `convex/lib/neonSeriesMap.ts`. Public keys stay readable — never use `CHP_*` as UI / signup keys.  
  See [`06-open-questions.md`](./06-open-questions.md).

- [ ] **Deploy Eve + AI Gateway** and set Convex env for real research:
  - `EVE_AGENT_URL`
  - `EVE_INVOKE_TOKEN`
  - `PIPELINE_RESEARCH_MODE=eve`
  - Production: `PIPELINE_ENV=production` (fail-closed; no silent fixture fallback)
  - Agent needs `NEON_DATABASE_URL` (read-only) for SQL

- [ ] Optional: `AI_GATEWAY_API_KEY` for local/cloud Eve runs outside Vercel AI Gateway wiring.

### B. Later pipeline product (not blocking idea review)

- [ ] WhatsApp / contact-finding flow for `awaiting_contacts` → interview phases  
- [ ] Interview capture → draft writer → draft review  
- [ ] **Publish bridge** from pipeline → Keystatic Markdoc → `published`  
- [ ] (Deferred) story-angle dedupe against already published articles  

### C. Site / ops (from root `TODO.md` — still open)

- [ ] Confirm Vercel Preview Convex URLs (`NEXT_PUBLIC_CONVEX_URL` + `NEXT_PUBLIC_CONVEX_SITE_URL`) and redeploy if needed  
- [ ] Finish Keystatic GitHub App smoke (save draft → Git commit; publish → live; Viewer blocked)  
- [ ] Production smoke: magic-link signup, preferences, `/uitschrijven` (newsletter only, site access stays), Resend bounce/complaint  
- [ ] Legal / editorial pass on welcome & verification emails  
- [ ] Mobile a11y / Core Web Vitals smoke on admin + published articles  

### D. Already decided (no action — for memory)

- Approve with **0** interviewees is allowed  
- All three title proposals are kept on approve (`finalTitle` comes later)  
- Person dedupe = `neonPersonId`  
- Generate is **manual** for now (no cron)  
- Code/comments English; agent prompts + IdeaBatch strings Dutch  
