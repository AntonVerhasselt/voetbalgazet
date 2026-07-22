# Architecture & Data Model

## Design principles

1. **One spine document per article journey** — an `editorialArticles` row (name TBD) lives from idea → published. Phases are fields + related child tables, not separate disconnected entities.
2. **Ideas are the first materialization of that spine** — when the research agent returns 5 ideas, we insert 5 article rows in `idea_review` (plus a research-run parent for batching/locking).
3. **External football identities stay external** — players/staff/clubs from Neon are referenced by stable Neon/RBFA IDs, not copied wholesale into Convex. Store the minimum denormalized labels needed for UI and the next agent.
4. **Human decisions are immutable events** — approvals, rejections, interviewee toggles append audit events; current state is denormalized for queries.
5. **Series scoping everywhere** — every list query is indexed by `divisionKey` (reeks).

## Pipeline phases

Visible pipeline for the admin workspace. Phase 1 implements through `idea_review` exit; later phases are stubs in schema/UI.

```text
researching          → ephemeral batch state (research run in progress)
idea_review          → human review of idea payload
awaiting_contacts    → WhatsApp agent finds contact details (future)
interview_scheduling → scheduling conversation (future)
interview_ready      → call can start (future)
interviewing         → realtime interview in progress (future)
interview_complete   → transcript stored (future)
drafting             → writer graph running (future)
draft_review         → human review of article draft (future)
ready_to_publish     → approved for Keystatic/site publish (future)
published            → live (future)
rejected             → terminal negative (from any human gate)
failed               → terminal agent failure (with retry possible on parent run)
```

### Phase machine (idea stage only)

```text
[Generate] → researchRuns.status = running
           → (no article rows yet, or optional placeholders)

[Eve success] → insert 5 editorialArticles (phase = idea_review)
              → researchRuns.status = succeeded

[Approve idea] → phase = awaiting_contacts
               → freeze selectedIntervieweeIds
               → write approval event

[Reject idea]  → phase = rejected
               → write rejection event + reason (optional)
```

While a research run is `running` for a series, UI disables “Genereer 5 ideeën” for that series (and optionally globally for that editor session).

## Recommended Convex tables

### 1. `researchRuns`

Tracks each “generate 5 ideas” job.

| Field | Type | Notes |
|-------|------|-------|
| `divisionKey` | `string` | Catalog key, e.g. `antwerpen-p1` |
| `status` | `"queued" \| "running" \| "succeeded" \| "failed" \| "cancelled"` | |
| `triggeredBy` | `Id<"users">` | |
| `requestedCount` | `number` | Always 5 for now |
| `eveSessionId` | `optional string` | Eve session id for observability |
| `startedAt` / `finishedAt` | `number` | |
| `errorMessage` | `optional string` | Safe, user-visible |
| `clientRequestId` | `string` | Idempotency from UI |
| `ideaIds` | `optional Id<"editorialArticles">[]` | Filled on success |

Indexes:

- `by_division_and_status` (`divisionKey`, `status`)
- `by_clientRequestId` (`clientRequestId`)
- `by_startedAt` (`startedAt`)

### 2. `editorialArticles` (pipeline spine)

One row per idea/article journey.

| Field | Type | Notes |
|-------|------|-------|
| `divisionKey` | `string` | Series scope |
| `phase` | union of phases above | Current phase |
| `researchRunId` | `Id<"researchRuns">` | Origin batch |
| `ideaTitle` | `string` | Working title of the idea |
| `titleProposals` | `string[3]` | Exactly 3 |
| `selectedTitle` | `optional string` | Chosen later (or on approve) |
| `whyInteresting` | `string` | |
| `supportingFacts` | `SupportingFact[]` | See below |
| `researchNotes` | `optional string` | Longer agent narrative / provenance |
| `interviewees` | `IntervieweeCandidate[]` | Max 3 from agent |
| `selectedIntervieweeKeys` | `string[]` | Subset of candidate keys enabled by editor |
| `rejectionReason` | `optional string` | |
| `createdAt` / `updatedAt` | `number` | |
| `approvedAt` / `approvedBy` | optional | |
| `rejectedAt` / `rejectedBy` | optional | |
| `schemaVersion` | `number` | Start at 1 |

Indexes:

- `by_division_and_phase` (`divisionKey`, `phase`)
- `by_division_and_updatedAt` (`divisionKey`, `updatedAt`)
- `by_researchRun` (`researchRunId`)
- `by_phase_and_updatedAt` (`phase`, `updatedAt`)

#### `SupportingFact`

```ts
{
  claim: string;           // human-readable fact
  evidence: string;        // what the query/result showed
  sqlFingerprint?: string; // optional hash/summary of query used
  source: "neon" | "archive" | "convex";
}
```

Facts must be grounded. Prefer storing evidence snippets (numbers, dates, opponent names) rather than only prose.

#### `IntervieweeCandidate`

```ts
{
  key: string;                 // stable within article, e.g. neon person id
  neonPersonId: string;        // Football Data Platform person id
  fullName: string;
  role: "player" | "staff" | "other";
  roleDetail?: string;         // "aanvaller", "trainer", …
  club: {
    neonClubId: string;
    neonTeamId?: string;
    name: string;
    divisionKey: string;       // should match article series when possible
  };
  whyInterview: string;        // agent rationale
  enabledDefault: boolean;     // usually true
}
```

Editor can only toggle `selectedIntervieweeKeys ⊆ interviewees[].key`. Cannot invent new contacts.

### 3. `editorialEvents` (audit log)

Append-only human + system events.

| Field | Type |
|-------|------|
| `articleId` | `Id<"editorialArticles">` |
| `type` | `"created" \| "approved" \| "rejected" \| "interviewees_updated" \| "phase_changed" \| "agent_note" \| …` |
| `actorUserId` | optional |
| `researchRunId` | optional |
| `payloadJson` | `string` (structured, size-bounded) |
| `createdAt` | `number` |

Index: `by_article_and_createdAt`.

### 4. Future tables (schema stubs / reserved names)

Do **not** fully implement now, but design `editorialArticles` so these attach cleanly:

| Table | Purpose |
|-------|---------|
| `contactLeads` | WhatsApp/outreach targets found for a club around a selected interviewee |
| `conversations` | WhatsApp threads with status / next retry |
| `interviews` | Scheduled call + OpenAI Realtime session metadata |
| `transcripts` | Full transcript + storage refs |
| `articleDrafts` | Writer graph revisions (draft → critique loops) |
| `factChecks` | Final check reports |
| `publishJobs` | Bridge into Keystatic / Git publish |

Each should reference `editorialArticles._id` and optionally `neonClubId` / `neonPersonId`.

## Why not store ideas separately from articles?

Alternative: `ideas` table → convert to `articles` on approve.

**Rejected for Phase 1** because:

- You need phase visibility for *every* item in the pipeline, including ideas.
- Contacts/transcripts/drafts all hang off the same journey.
- Approval is a phase transition, not a type change.

If rejected ideas clutter the board, filter default view to non-rejected, and keep a “Afgewezen” bin.

## Series (= division) model

Reuse existing catalog:

- Keystatic/YAML: `apps/web/content/settings/divisions.yaml`
- Convex: `divisions.externalKey` / preference catalog `divisionOptions`

AI Journalist workspace stores/filters by **`divisionKey` string** (catalog key), not necessarily `Id<"divisions">`, because:

- Neon football DB will use its own division identifiers; mapping layer will translate.
- Catalog keys are already stable in the app (`antwerpen-p1`, …).

Add a mapping doc later: `divisionKey` ↔ Neon competition/division id. Until Neon schema is inspected, treat mapping as an open question.

## Relationship to published site articles

Today’s Markdoc articles have `divisionKeys`, `teamKeys`, etc.

AI pipeline articles are **not** automatically site articles. Bridge options (later):

1. Writer produces Markdoc → Keystatic/Git commit PR.
2. Writer stores draft in Convex → human copies/publishes via Keystatic.
3. Hybrid: Convex draft with “Export to Keystatic” action.

Phase 1 only needs a future `publishSlug` / `keystaticPath` optional field reserved on `editorialArticles`.

## Neon identity contract (minimum)

Until the Football Data Platform schema is documented in-repo, the research agent must return:

- `neonPersonId` (required for each interviewee)
- `neonClubId` (required)
- `neonTeamId` (optional but preferred)
- Human labels for UI

The next agent (contacts) will query Neon/WhatsApp using `neonClubId` to find people who can provide contact details for `neonPersonId`.

## Duplication / archive awareness

Agent rules: search article archive before proposing. Store on each idea:

```ts
archiveChecks?: {
  searchedAt: number;
  relatedSlugs: string[];
  overlapNotes?: string;
}
```

Archive access mechanism TBD (HTTP API vs Neon `articles` table vs Git content). See open questions.

## Validation rules (Convex)

- `titleProposals.length === 3`
- `interviewees.length <= 3`
- `selectedIntervieweeKeys` every key exists in `interviewees`
- On approve: `selectedIntervieweeKeys.length >= 1` (confirm in open questions — maybe 0 allowed?)
- `supportingFacts.length >= 1` (recommend ≥ 2)
- `phase` transitions validated server-side (whitelist map)
- Research run: only one `running` per `divisionKey` (or per division+trigger concurrency policy)

## Size / retention

- Cap `supportingFacts` array (e.g. 12)
- Cap evidence string lengths
- Research run logs / Eve traces live in Vercel Observability; Convex stores summary + error only
- Rejected ideas retained ≥ 90 days (align with other retention later)

## ER sketch

```text
researchRuns 1───* editorialArticles
editorialArticles 1───* editorialEvents
editorialArticles 1───* interviewees (embedded array, Phase 1)
editorialArticles 1───* contactLeads (future table)
editorialArticles 1───* interviews (future)
editorialArticles 1───* articleDrafts (future)
```

Embedded interviewee array is enough for max 3. Promote to table only if we need cross-article person queries later.
