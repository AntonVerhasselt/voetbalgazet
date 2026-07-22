# Architecture & Data Model — Pipeline

## Design principles

1. **One spine per journey** — `pipelineArticles` from idea → published.  
2. **Ideas are articles in `idea_review`** — not a throwaway table.  
3. **Neon owns football identity** — Convex stores denormalized labels + foreign ids.  
4. **Contacts are first-class** — see [`08-contacts-data-model.md`](./08-contacts-data-model.md).  
5. **Human decisions are events** — approvals/rejects/toggles audited.  
6. **Series scoping everywhere** — Neon-aligned `divisionKey`.  
7. **Rejected rows stay**; default queries exclude `phase === "rejected"`.  
8. **Article-archive search is out of scope** for this phase (no `articleArchive` table yet).

## Pipeline phases

```text
idea_review
awaiting_contacts
interview_scheduling
interview_ready
interviewing
interview_complete
drafting
draft_review
ready_to_publish
published
rejected          ← terminal; filtered from default UI
failed            ← agent failure on article (rare; usually run-level)
```

Research-in-progress lives on **`pipelineResearchRuns`**, not as an article phase.

### Idea-stage transitions

```text
[Generate for reeks R]
  → ensure no queued|running run for R  (other reeksen unaffected)
  → insert pipelineResearchRuns (queued → running)
  → Eve or fixtures
  → insert 5 pipelineArticles (idea_review)
  → upsert contacts + pipelineArticleContacts

[Toggle interviewee] → update pipelineArticleContacts.selected

[Approve] → phase awaiting_contacts
          → keep all titleProposals (no finalTitle required)
          → freeze selected flags (0..3)
          → event approved

[Reject]  → phase rejected (+ optional reason)
          → event rejected
          → disappears from default Ideeën list
```

## Tables (Convex)

### `pipelineResearchRuns`

| Field | Type | Notes |
|-------|------|-------|
| `divisionKey` | `string` | Neon-aligned |
| `status` | `queued \| running \| succeeded \| failed \| cancelled` | |
| `source` | `fixture \| eve` | Phase A = fixture |
| `triggeredBy` | `Id<"users">` | |
| `requestedCount` | `number` | Always 5 |
| `eveSessionId` | `optional string` | |
| `startedAt` / `finishedAt` | `number` | |
| `errorMessage` | `optional string` | Safe; Dutch for UI if user-facing |
| `clientRequestId` | `string` | Idempotency |
| `ideaIds` | `optional Id<"pipelineArticles">[]` | |

Indexes: `by_division_and_status`, `by_clientRequestId`, `by_startedAt`.

**Lock:** at most one `queued|running` per `divisionKey` only.

### `pipelineArticles`

| Field | Type | Notes |
|-------|------|-------|
| `divisionKey` | `string` | |
| `phase` | phase union | |
| `researchRunId` | `Id<"pipelineResearchRuns">` | |
| `ideaTitle` | `string` | Dutch content |
| `titleProposals` | `string` × 3 | **All kept** through approve |
| `finalTitle` | `optional string` | Set much later (writer/publish) |
| `whyInteresting` | `string` | Dutch content |
| `supportingFacts` | `SupportingFact[]` | |
| `researchSummary` | `optional string` | |
| `rejectionReason` | `optional string` | |
| `approvedAt` / `approvedBy` | optional | |
| `rejectedAt` / `rejectedBy` | optional | |
| `createdAt` / `updatedAt` | `number` | |
| `schemaVersion` | `number` | 1 |

Indexes: `by_division_and_phase`, `by_division_and_updatedAt`, `by_researchRun`, `by_phase_and_updatedAt`.

Default Ideeën query: `phase === "idea_review"` only (rejects excluded).

#### `SupportingFact`

```ts
{
  claim: string;      // Dutch prose
  evidence: string;   // grounded snippet
  sqlFingerprint?: string;
  source: "neon" | "convex";
}
```

### `pipelineArticleContacts` + `contacts`

See [`08-contacts-data-model.md`](./08-contacts-data-model.md).

### `pipelineEvents`

Audit: `created | approved | rejected | interviewees_updated | phase_changed | …`

## Taxonomy migration (Neon-first)

Placeholder YAML keys (`antwerpen-p1`, …) are temporary.

1. Introspect Neon competitions/divisions/clubs/teams.  
2. Choose canonical string id for Pipeline + Convex `divisions.externalKey`.  
3. Dry-run migrate subscribers’ division prefs.  
4. Update Keystatic settings / public signup catalog in a coordinated change.

## Relationship to Keystatic site articles

Pipeline ≠ automatically published Markdoc. Publish bridge later.  
**Published-article search/dedupe is out of scope** for the idea-agent MVP.

## Validation rules

- Exactly 5 ideas per successful run (all-or-nothing)  
- `titleProposals.length === 3`  
- ≤3 article–contact links from research  
- Approve with 0–3 selected contacts  
- Phase transitions whitelisted server-side  
- String length caps on all agent text fields  

## ER sketch

```text
pipelineResearchRuns 1───* pipelineArticles
pipelineArticles 1───* pipelineEvents
pipelineArticles 1───* pipelineArticleContacts *───1 contacts
contacts indexed by neonPersonId, neonClubId, neonTeamId
```
