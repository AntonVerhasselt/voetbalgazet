# Admin UX — Pipeline

## Placement in admin

Add a primary nav item:

- Label: **Pipeline** (short: **Pipe**)
- Route root: `/admin/pipeline`
- Roles: `admin` + `journalist` can generate/approve; `viewer` read-only or hidden generate/approve

Preserve existing admin shell patterns (`admin-shell`, `admin-nav`, Dutch copy).

## Information architecture

```text
/admin/pipeline
  └─ series selector (reeks) — sticky top bar
  └─ phase tabs / pipeline strip
  └─ list for active phase
  └─ detail page for one article/idea

/admin/pipeline/ideeen            → phase idea_review (default)
/admin/pipeline/contacten         → awaiting_contacts (stub)
/admin/pipeline/interviews        → interview_* (stub)
/admin/pipeline/drafts            → drafting / draft_review (stub)
/admin/pipeline/[articleId]       → detail + actions
```

Deep-link: `?reeks=<neon-aligned-division-key>`.

## 1) Series selector (top, important, compact)

**Job:** Choose which division’s pipeline you are looking at.

Requirements:

- Always visible at top of Pipeline workspace (below admin header, above phase strip).
- Compact single row: label “Reeks” + searchable / grouped select.
- Options come from **Neon-aligned** Convex `divisions` catalog (after Phase B migration; placeholders OK only until then).
- Persist last selection in `localStorage` + URL.
- Changing reeks reloads counts/lists; does not cancel an in-flight run for the previous reeks.
- Badge: count in `idea_review` for selected reeks.

Visual: one control, one purpose; match existing admin density (not a marketing hero).

## 2) Pipeline / phase visibility

Horizontal phase strip with counts for the selected series:

```text
Ideeën (12) · Contacten (3) · Interviews (1) · Drafts (0) · Klaar (0)
```

- Active phase emphasized.
- Rejected/failed via secondary filter (default TBD — `Q7`).
- Phase 1: only **Ideeën** fully interactive; others stubbed.

## 3) Idea phase view

### Header actions

Primary: **Genereer 5 ideeën**

| State | Button |
|-------|--------|
| Idle | Enabled |
| `pipelineResearchRuns` queued/running for this reeks | Disabled + “Bezig met research…” |
| Failed | Enabled; show last error + retry |

### Phase A stub (fixture ideas)

Until Eve is wired (Phase D), generate inserts **5 fixture ideas**: schema-valid fake objects (Dutch-ish sample titles/facts) so UI (list, detail, approve, reject, toggles) can be built and tested. Clearly marked in UI as fixtures if useful (`researchRun` flag `source: "fixture"`).

### List

Per idea: idea title, title-proposal hint, interviewee selected/total, created time, status.

### Detail

1. Ideetitel  
2. 3 artikelitels (title pick on approve TBD — `Q6`)  
3. Waarom interessant  
4. Ondersteunende feiten  
5. Te interviewen (0–3) — toggle enable/disable only; **cannot add** people  
6. **Goedkeuren** (0 interviewees allowed) / **Afwijzen** (optional reason)

Generate lock does not block reviewing existing ideas.

## 4) Empty & error states

- Empty: short copy + generate CTA.  
- Failure: Dutch message, retry.  
- **All-or-nothing** batches — never insert 3/5.

## 5) Realtime UX

Convex `useQuery` / `useMutation`. Client `clientRequestId` for idempotent generate.

## 6) Mobile

Full-width series selector; horizontally scrollable phase strip; detail as full page on small screens; ≥44px actions.

## 7) Copy (Dutch)

- Nav: Pipeline  
- Generate: Genereer 5 ideeën  
- Approve: Idee goedkeuren  
- Reject: Idee afwijzen  
- Interviewees: Voorstel om te interviewen  
- Toggle off: Niet interviewen  
- Phases: Ideeën / Contacten / Interviews / Drafts / Publicatie  

## 8) Non-goals (Phase 1 UX)

- Full kanban drag-and-drop  
- Manual idea creation  
- Multi-reeks single screen  
- Exposing raw Eve logs to all editors (admin link to Agent Runs later)
