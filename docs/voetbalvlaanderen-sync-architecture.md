# Voetbal Vlaanderen → Neon sync architecture

How to **copy** and **continuously update** football data for a fixed list of
~35 series, using the public RBFA GraphQL API, **Vercel Functions**, and
**Neon Postgres** (not Convex).

Companions:

- [`voetbalvlaanderen-api.md`](./voetbalvlaanderen-api.md) — GraphQL endpoint & operations
- [`voetbalvlaanderen-neon-sync-guide.md`](./voetbalvlaanderen-neon-sync-guide.md) — **Neon schema, local seed, GitHub Actions schedule (step-by-step)**

Client experiments: `scripts/voetbal-vlaanderen/`

---

## Verdict

| Question | Answer |
|---|---|
| Can we duplicate their DB for given series IDs? | **Mostly yes**, via GraphQL — not a dump, but a structured pull per series. |
| Can calendar queries include full match detail (lineups/events)? | **No.** Extra fields are accepted on the type but resolvers return `null` and often throw server errors. Use `GetMatchDetail` per match. |
| Can we batch efficiently for 35 series? | **Yes.** One aliased GraphQL request can pull calendars for all 35 series (~0.5s, verified). |
| Historical gameweek rankings from API? | **No.** Rankings are current (+ “periode” tables). **Snapshot yourself** after matchdays. |
| Backend | Vercel Cron + Functions (+ optional queue). Neon for storage. |

---

## What the API can give you

### Available (verified)

| Domain | Operations | Notes |
|---|---|---|
| Series list/discovery | `competitions(discipline, committee, competitionType)` | e.g. `Football` + `Voetbal Vlaanderen` + `championship` → 185 series |
| Series meta | `GetSeriesDetail` | `showRanking`, `showScore`, age group |
| Teams in series | `getTeamsInSeries` | ~12–16 teams/series; **442 teams / 348 clubs** across first 35 VV championships |
| Fixtures + scores | `GetSeriesCalendar(start,end)` | **Full season in one call** (210–240 matches observed). Scores on finished matches when `showScore` |
| Compact fixtures | `GetSeriesCalendarSmall` | Upcoming/previous widgets only |
| Standings | `GetSeriesRankings` | `rankings[].type` + `teams[]` (points, W/D/L, GD, …). `null` until season publishes a table |
| Match detail | `GetMatchDetail` | Venue, officials, lineups, subs, staff, timeline events |
| Club | `getClub`, `getClubInfo` | Address, contacts, kits, venue |
| Club teams | `getClubTeams` | All ploegen under a club |
| Squad / staff | `GetTeamMembers` | Players + staff + season stats — **often empty** until published |
| Nearby clubs | `clubFinder` | Needs `location{lat,lng,distance}` + `gender: men\|women` |

### Event kinds (match timeline)

UI supports: `goal` / `goalScored`, `og` / `owngoal`, `penalty` / `penaltymiss`,
`yellow`, `red`, `yellowred`, `in`, `out`.

In practice (friendlies scanned Jul 2026): mostly `yellow`, `in`, `out`.
**Goals are not always present as events** — always trust `outcome.homeTeamGoals/awayTeamGoals` for the score. Scorers only when the timeline includes goal events.

### Ranking “periods”

Not gameweeks. Belgian **periode** tables:

- `generalRanking`, `firstPeriodRanking` … `seventhPeriodRanking`

For “ranking after each speeldag”, **you must snapshot** `GetSeriesRankings` into Neon whenever the table changes.

### What you cannot get

- GraphQL **introspection** (disabled)
- Lineups/events **inside** calendar queries (null + resolver errors)
- Historical ranking time-travel from the API
- Reliable squads for all amateur teams (`teamMembers` often `[]`)
- Rich player PII (birth date only via national-team search results, not club squads)
- A single “download entire federation DB” endpoint

---

## GraphQL experiments (do / don’t)

### Do: ask for slightly more on calendars

These **work** on `seriesCalendar` / useful for sync:

- `outcome.isFinished`, `eventType`, `ageGroup`
- Sometimes `location` (often null until assigned)

### Don’t: expect lineups on calendars

Requesting `lineup` / `events` / `staffLineup` on `seriesCalendar`:

- Response keys appear, but values stay `null`
- Server returns many `Cannot read property 'filter' of undefined` errors
- Still returns the match list — noisy and useless for detail

### Do: alias many series in one HTTP call

Verified: **35** `seriesCalendar` aliases in one POST → 270 matches in ~0.5s.

Also works: Apollo-style **JSON array batch** of operations.

### Do: wide date windows

`startDate=2026-07-01`, `endDate=2027-06-30` returned full season calendars
without pagination.

---

## Neon data model (sketch)

Keep RBFA IDs as primary/natural keys (`text`), mirror their namespaces
(`CHP_*`, `CUP_*`, club/team/match numeric strings).

```text
series                (id, name, channel, show_ranking, show_score, age_group, ...)
clubs                 (id, name, registration_number, logo, typ_ligue, ...)
club_info             (club_id PK, address jsonb, venue jsonb, contacts jsonb, kits jsonb, ...)
teams                 (id, club_id, name, complement, logo, ...)
series_teams          (series_id, team_id, ...)

persons               (id, first_name, last_name, photo, ...)   -- player/staff ids from API
team_players          (team_id, person_id, stats jsonb, synced_at)
team_staff            (team_id, person_id, function text[], ...)

venues                (id, name, city, postal_code, address, ...)
matches               (id, series_id, start_time, state, event_type, home_team_id, away_team_id,
                       home_goals, away_goals, show_score, venue_id, raw jsonb, detail_synced_at, ...)
match_officials       (match_id, role, first_name, last_name, ...)
match_lineup_players  (match_id, team_side, person_id, shirt_number, is_sub, badges, ...)
match_staff           (match_id, team_side, person_id, function, ...)
match_events          (match_id, minute, team_side, person_name, kind, ...)

ranking_snapshots     (id, series_id, ranking_type, captured_at, matchday_key, payload jsonb)
                      -- matchday_key e.g. hash of (sum matches_played) or speeldag number you compute

sync_series           (series_id PK, enabled, season_start, season_end, last_calendar_sync, last_ranking_sync)
sync_jobs             (id, type, payload jsonb, status, run_after, attempts, ...)
```

**Gameweek ranking:** after each detected matchday completion (or every time
standings change), insert a `ranking_snapshots` row. Derive `matchday_key` as:

- `sum(matches_played)` across the general table, or
- your own speeldag counter from the calendar

---

## Sync design for ~35 series

### Phase A — seed (once / on series list change)

Input: list of `seriesId`s you provide.

```text
1. Upsert sync_series rows
2. For each series (parallel, concurrency ~10):
     GetSeriesDetail
     getTeamsInSeries
     GetSeriesCalendar(season_start, season_end)   # or 1 aliased mega-query for all 35
3. Collect unique clubIds / teamIds from teams + calendars
4. For each club: getClub + getClubInfo
5. For each team: GetTeam (+ GetTeamMembers when non-empty)
6. Enqueue GetMatchDetail for every match with state in (finished, ongoing)
     or defer detail until first “live” update if season not started
```

**Cost (order of magnitude, 35 VV provincial/national series):**

| Step | Requests |
|---|---|
| Calendars | **1** aliased call (or 35 singles) |
| Series detail + teams | ~70 |
| Clubs | ~350 |
| Team members | ~450 (many empty) |
| Match details (if mid-season, many finished) | hundreds–thousands |

Off-season seed is cheap (calendars planned, few details). Mid-season backfill
of details should be **queued and rate-limited** (we did 50 match details in
~15s sequential with no throttling observed — still be polite: ~5–10 RPS).

### Phase B — keep up to date (continuous)

```text
Vercel Cron (every 5–15 min; every 1–2 min on Saturday/Sunday afternoons)
  └─ pollCalendars()
       POST one aliased GetSeriesCalendar for all 35 series
         window: today-1d .. today+14d   (or full season if cheap enough)
       diff vs Neon matches (state, goals, start_time)
       for each changed/finished match → enqueue job match.detail
       if any finished in series → enqueue job series.rankings
```

**Job workers** (Vercel function invoked by cron draining `sync_jobs`, or
Inngest/Trigger.dev/QStash):

| Job | Action |
|---|---|
| `match.detail` | `GetMatchDetail` → upsert match, lineups, events, venue, officials |
| `series.rankings` | `GetSeriesRankings` → insert snapshot if payload changed |
| `team.members` | periodic (daily) refresh of `GetTeamMembers` for teams in scope |
| `club.refresh` | weekly `getClubInfo` |

### Why this is efficient

1. **Calendar poll is O(1) HTTP** for 35 series (aliasing).
2. **Scores appear on calendar** — you often know a match finished without
   detail; detail is only for lineups/events/venue.
3. **Rankings polled per series only when something finished**, not every cron.
4. No browser, no HTML, no Convex.

### Live / in-play (optional)

If you need live scores during matches:

- Shorten cron to 60–120s while `state` ∈ {`ongoing`, …} exists in window
- Still use calendar for score; call `GetMatchDetail` less often (e.g. every
  5 min) for events, or only after `finished`

---

## Vercel layout (suggested)

```text
apps/web or apps/sync/
  app/api/cron/poll-calendars/route.ts    # protected by CRON_SECRET
  app/api/cron/drain-jobs/route.ts
  app/api/admin/series/route.ts           # register series IDs
  lib/rbfa/client.ts                      # GraphQL client (from scripts/)
  lib/rbfa/queries/*.graphql
  lib/db/*                                # drizzle/kysely/prisma → Neon
```

`vercel.json` crons:

```json
{
  "crons": [
    { "path": "/api/cron/poll-calendars", "schedule": "*/10 * * * *" },
    { "path": "/api/cron/drain-jobs", "schedule": "* * * * *" }
  ]
}
```

Env: `DATABASE_URL` (Neon), `CRON_SECRET`, optional `RBFA_GRAPHQL_URL`.

Use **Neon serverless driver** (`@neondatabase/serverless`) from Vercel.

---

## Idempotency & truth

- Upsert on RBFA ids; treat GraphQL as source of truth.
- Store `raw jsonb` on matches for fields you didn’t map yet.
- `detail_synced_at` — skip re-fetch if finished and unchanged score + already detailed (re-fetch once more ~1h after finish for late events).
- Ranking snapshots: only insert when `md5(payload) != last`.

---

## Realistic expectations (“all data”)

| You want | You get |
|---|---|
| All matches in 35 series | Yes — calendars |
| Scores | Yes — calendar + detail |
| Lineups / subs / staff / venue | Yes — per finished (or started) match via detail |
| Cards / subs timeline | Yes when API fills events |
| Goal scorers | Only when event kind is goal* (not guaranteed) |
| Current + periode rankings | Yes when published |
| Ranking after every gameweek | Yes — **your snapshots** |
| Complete amateur squads | Partial — `teamMembers` often empty |
| Coaches | Via `teamMembers.staff` / match `staffLineup` when present |
| Every club in Belgium | Out of scope unless you expand series list / clubFinder |

---

## Recommended rollout

1. **Register 35 series IDs** in `sync_series`.
2. Implement GraphQL client + Neon schema + seed script (Vercel function or one-shot).
3. Run seed; verify calendars + teams/clubs.
4. Turn on calendar poll cron + match.detail worker.
5. When rankings become non-null (season start), enable ranking snapshots.
6. Add daily `teamMembers` refresh; accept gaps.
7. Only then build product UI on Neon.

---

## Vercel feasibility (duration, crons, “background”)

### Short answer

**Yes — feasible on Vercel Pro + Neon**, if you **chunk work** and do **not** rely on `waitUntil`/`after()` as a fake long-running worker.

Hobby is a poor fit for live updates (cron only once/day).

### Measured workloads vs limits

| Workload | Observed / estimated | Vercel budget |
|---|---|---|
| Poll 35 series (aliased, ~2 weeks) | ~0.5–1s GraphQL | Trivial |
| Seed calendars 35 series **full season** | ~3s, **~2.7 MB**, ~7900 matches | Fine under default **300s** |
| Club/team enrich (~350 clubs) @ 10 concurrent | ~tens of seconds | Fine |
| Match-detail backfill 500 finishes @ 10 conc. | ~18s | Fine |
| Match-detail backfill **~8400** (full season all series) @ 10 conc. | ~**5 min** | Fits **300s default only if nothing else runs** — **chunk it** |
| Weekend burst (~35×8 finishes) | ~tens of seconds | Fine |

Fluid Compute duration (Node, current docs):

| Plan | Default | Max | Extended (beta) |
|---|---|---|---|
| Hobby | 300s | 300s | — |
| Pro / Enterprise | 300s | **800s** | **1800s** (function-level `maxDuration`) |

Cron: same duration as the function it invokes. Pro can run every minute; **Hobby max once/day**.

### What “background functions” actually mean here

| Mechanism | Extends past `maxDuration`? | Durable if crash? | Use for |
|---|---|---|---|
| `waitUntil` / Next.js `after()` | **No** — same invocation timeout | **No** | Tiny post-response side effects |
| Longer `maxDuration` (800 / 1800) | Yes, up to that cap | No (one shot) | Single chunk of seed/drain |
| Cron + `sync_jobs` table drain | Yes (many short runs) | **Yes** if job row first | **Recommended default** |
| Vercel Workflows / Queues / Inngest / QStash | Designed for long/multi-step | Yes | Optional if job graph grows |

So: do **not** start a seed in `after()` and hope it runs for 30 minutes. Persist jobs in Neon, return 200, drain in cron (or Workflow steps).

### Real hurdles

1. **Plan: need Pro** for `*/10 * * * *` (or similar) polling. Hobby cannot do live score refresh.
2. **Do not monolith the seed** — especially mid-season match-detail backfill. Split: calendars → clubs → members → detail batches of N matches per invocation.
3. **`waitUntil`/`after` are not a queue** — same timeout; lost on crash. Always write intent to `sync_jobs` first.
4. **Cron overlap** — if a drain runs longer than the interval, Vercel can start another. Use a DB/Redis lock or `SKIP LOCKED` job claim.
5. **Response size** — full-season 35-series calendar ~2.7 MB (OK). Keep poll windows narrow for cron; use full season only on seed.
6. **Neon connections** — use **pooled** URL + global `pg` Pool + `attachDatabasePool` from `@vercel/functions` under Fluid. Avoid opening a new client per query without pooling.
7. **Region** — put the function near RBFA (EU) and Neon EU (e.g. `fra1`) to cut I/O wait; Active CPU pauses during fetch/DB wait under Fluid billing.
8. **RBFA risk** — no rate limit seen in tests; still cap concurrency (5–10) and backoff. They could throttle later.
9. **Secure Compute / Static IPs** — if you ever need egress allowlisting, extended 30‑min duration may not apply (beta caveat); prefer chunked jobs anyway.
10. **Data gaps aren’t a Vercel issue** — empty `teamMembers`, missing goal events, null rankings until season start remain API limitations.

### Recommended Vercel shape (safe)

```text
Pro project, Fluid on, region fra1 (or similar EU)

Cron every 10 min  → /api/cron/poll-calendars   maxDuration=60
                     (1 GraphQL alias call + upsert + enqueue jobs)

Cron every 1 min   → /api/cron/drain-jobs        maxDuration=300
                     (claim ≤50 jobs with SKIP LOCKED; process; exit)

Admin/manual       → /api/admin/seed-series      enqueues phases only
```

Optional later: Vercel Workflows or Inngest if you want retries/visibility without building a job table — not required for v1.

### Anti-patterns

- Scraping voetbalvlaanderen.be HTML / controlling a browser for sync
- Calling `GetMatchDetail` for every planned match every poll
- Expecting calendar queries to return lineups
- Storing only “current ranking” if you care about speeldag history
- Running this sync inside Convex (use Vercel + Neon as decided)
- One Vercel function that backfills thousands of match details without chunking
- Using `after()`/`waitUntil` as the only “background worker” for seed/sync

---

## Quick reference — minimal poll query shape

```graphql
query Poll($language: Language!, $s: String!, $e: String!) {
  s0: seriesCalendar(seriesId: "CHP_…", startDate: $s, endDate: $e, language: $language) {
    id state startTime showScore
    homeTeam { id name clubId }
    awayTeam { id name clubId }
    outcome { status homeTeamGoals awayTeamGoals isFinished }
    series { id name }
  }
  # … s1..s34
}
```

Then for each newly finished `id`: `GetMatchDetail`, and per affected series:
`GetSeriesRankings`.
