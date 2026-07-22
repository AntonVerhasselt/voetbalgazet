# Admin UX — AI Journalist Pipeline

## Placement in admin

Add a primary nav item next to existing redactie tools:

- Label: **Journalist** (short: **AI**)
- Route root: `/admin/journalist`
- Roles: `admin` + `journalist` can generate/approve; `viewer` optional read-only (recommend: hide generate/approve)

Preserve existing admin shell patterns (`admin-shell`, `admin-nav`, Dutch copy).

## Information architecture

```text
/admin/journalist
  └─ series selector (reeks) — sticky top bar
  └─ phase tabs / pipeline strip
  └─ list for active phase
  └─ detail drawer/page for one article/idea

/admin/journalist/ideeen          → phase idea_review (default)
/admin/journalist/contacten       → awaiting_contacts (stub)
/admin/journalist/interviews      → interview_* (stub)
/admin/journalist/drafts          → drafting / draft_review (stub)
/admin/journalist/[articleId]     → detail + actions
```

Deep-link with query: `?reeks=antwerpen-p1` so series survives navigation.

## 1) Series selector (top, important, compact)

**Job:** Choose which division’s pipeline you are looking at. Nothing else.

Requirements:

- Always visible at top of Journalist workspace (below admin header, above phase strip).
- Compact: single row — label “Reeks” + searchable select or province-grouped dropdown.
- Reuse catalog data (`divisionOptions` / Convex `divisions`), not free text.
- Persist last selected reeks in `localStorage` (and URL).
- Changing reeks reloads counts + lists; does not interrupt an in-flight run for the previous reeks (that run continues server-side).
- Show small badge: count in `idea_review` for selected reeks.

Visual guidance (fit existing admin; don’t invent a marketing landing page):

- Not a hero, not cards-for-decoration.
- One control, one purpose.
- Match admin typography/spacing already used in nieuwsbrief flows.

## 2) Pipeline / phase visibility

**Job:** Show where every article sits; navigate phase-specific queues.

Recommended UI: horizontal **phase strip** with counts for the selected series:

```text
Ideeën (12) · Contacten (3) · Interviews (1) · Drafts (0) · Klaar (0)
```

- Active phase emphasized.
- Rejected/failed accessible via secondary filter, not main strip.
- Each phase view has one primary purpose (list + act).

For Phase 1, only **Ideeën** is fully interactive; others show empty/stub states (“Volgt in een volgende agentfase”).

## 3) Idea phase view

### Header actions

Primary button: **Genereer 5 ideeën**

| State | Button |
|-------|--------|
| Idle | Enabled |
| `researchRuns` running for this reeks | Disabled + spinner/label “Bezig met research…” |
| Failed | Enabled again; show last error banner with retry |

Also show last run timestamp + status.

### List

Each idea row (not heavy cards unless interaction needs a container):

- Idea title
- First title proposal (or “3 titelvoorstellen”)
- Interviewee count selected/total (e.g. `2/3`)
- Relative created time
- Status chip: Te beoordelen / Goedgekeurd / Afgewezen (if mixed filters)

Click → detail.

### Detail (review surface)

Easy scan of structured fields:

1. **Ideetitel**
2. **3 artikelitels** — radio to pick preferred title on approve (optional but useful)
3. **Waarom interessant**
4. **Ondersteunende feiten** — claim + evidence list
5. **Te interviewen** — max 3 rows with:
   - Name
   - Role
   - Club
   - Why interview
   - Toggle **enabled/disabled** (cannot add people)
6. Actions:
   - **Goedkeuren** (requires ≥1 enabled interviewee — confirm)
   - **Afwijzen** (optional reason textarea)
7. Meta: research run link, division, timestamps

While a generate run is active, detail actions remain available on existing ideas (only the generate button locks).

### Interviewee toggle rules

- Default: all agent-suggested people enabled.
- Editor may disable 1–2 (or all — product decision).
- Disabled people remain stored for audit but are excluded from `selectedIntervieweeKeys` on approve.
- No manual “add contact” in this phase.

## 4) Empty & error states

- No ideas yet: short explanation + generate CTA.
- Neon/agent failure: Dutch error, no stack traces; link to retry.
- Partial failure: never insert 3/5 silently — fail the run, insert nothing (or mark run failed and keep prior ideas). **All-or-nothing per batch.**

## 5) Realtime UX

Use Convex reactivity:

- `useQuery` for ideas by division+phase
- `useQuery` for active research run
- `useMutation` for generate / approve / reject / toggle interviewees

Generate flow:

1. Client creates `clientRequestId` (uuid).
2. `startResearchRun({ divisionKey, clientRequestId })`.
3. Mutation schedules action / kicks orchestrator.
4. Button disabled while run `queued|running` for that division.
5. On success, list populates with 5 new ideas.

## 6) Mobile

Admin is already mobile-conscious. For Journalist:

- Series selector full-width on small screens.
- Phase strip horizontally scrollable.
- Detail as full page on mobile, side panel on desktop if desired.
- Approve/reject targets ≥ 44px.

## 7) Copy (Dutch)

Suggested:

- Nav: Journalist
- Generate: Genereer 5 ideeën
- Approve: Idee goedkeuren
- Reject: Idee afwijzen
- Interviewees: Voorstel om te interviewen
- Toggle off: Niet interviewen
- Pipeline: Ideeën / Contacten / Interviews / Drafts / Publicatie

## 8) Non-goals for UX Phase 1

- Kanban drag-and-drop across all phases
- Inline SQL / agent log viewer for editors (nice-to-have later; link to Vercel Agent Runs for admins)
- Manual idea creation form
- Multi-reeks dashboard on one screen
