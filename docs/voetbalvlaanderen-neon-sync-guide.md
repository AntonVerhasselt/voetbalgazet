# Voetbal Vlaanderen → Neon: step-by-step sync guide

Chronological playbook for copying RBFA / Voetbal Vlaanderen data into **Neon Postgres**, seeding **locally**, and keeping it fresh with **GitHub Actions** (free).

Related docs:

- [`voetbalvlaanderen-api.md`](./voetbalvlaanderen-api.md) — GraphQL endpoint & operations
- [`voetbalvlaanderen-sync-architecture.md`](./voetbalvlaanderen-sync-architecture.md) — architecture & Vercel notes
- Client / queries: `scripts/voetbal-vlaanderen/`

**API endpoint:** `POST https://datalake-prod2018.rbfa.be/graphql`  
**Language:** `nl`  
**Auth:** none (send `Origin` / `Referer` from `https://www.voetbalvlaanderen.be`)

**Timezone for schedules:** `Europe/Brussels` (Belgian local time).

---

## 0. Chronological overview

```text
1. Design Neon schema (this doc §1)
2. Configure list of series IDs (you provide)
3. LOCAL SEED (this doc §2)
     → series, clubs, teams, squads, full calendars,
       finished match details, rankings snapshots
4. Commit seed scripts + Actions workflow
5. ONGOING UPDATES via GitHub Actions (this doc §3)
     → calendars / scores / match details / new players / rankings
```

---

## 1. Neon data structure

Design goal: **persist everything the GraphQL API returns** for our series. Prefer typed columns for fields we query often; keep `raw jsonb` for full payloads so nothing is lost when the API adds fields.

Use RBFA string IDs as natural keys (`text`), e.g. `CHP_130005`, `1553`, `362663`, `7567807`.

### 1.1 Entity relationship (high level)

```text
series ←—— series_teams ——→ teams ——→ clubs
                │              │
                │              ├── team_players ——→ persons
                │              └── team_staff   ——→ persons
                │
                └── matches ——→ venues
                      ├── match_officials
                      ├── match_lineup_players ——→ persons
                      ├── match_substitutes    ——→ persons
                      ├── match_staff_lineup   ——→ persons
                      ├── match_events
                      └── match_shootout

series ——→ ranking_snapshots (time series of tables)
sync_series / sync_runs (ops)
```

**Persons are global.** A player who appears for Team A and Team B (e.g. first team + reserves of the same club) is **one** `persons` row and **two** `team_players` rows.

### 1.2 Tables

#### `sync_series` — which competitions we mirror

| Column | Type | Source / notes |
|---|---|---|
| `series_id` | `text` PK | Your configured ID (`CHP_*`, `CUP_*`, …) |
| `enabled` | `boolean` | |
| `season_start` | `date` | e.g. `2026-07-01` |
| `season_end` | `date` | e.g. `2027-06-30` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

#### `series`

| Column | Type | GraphQL |
|---|---|---|
| `id` | `text` PK | `series.id` / `GetSeriesDetail` |
| `name` | `text` | `name` |
| `channel` | `text` | `channel` |
| `show_ranking` | `boolean` | `showRanking` |
| `show_score` | `boolean` | `showScore` |
| `age_group` | `text` | `ageGroup` |
| `has_fairplay_ranking` | `boolean` | `hasFairplayRanking` |
| `raw` | `jsonb` | full `series` object |
| `synced_at` | `timestamptz` | |

#### `clubs`

| Column | Type | GraphQL |
|---|---|---|
| `id` | `text` PK | `club.id` / `getClub` |
| `name` | `text` | `name` |
| `registration_number` | `text` | `registrationNumber` |
| `logo` | `text` | `logo` |
| `typ_ligue` | `text` | `typLigue` |
| `raw_club` | `jsonb` | full `getClub` |
| `synced_at` | `timestamptz` | |

#### `club_profiles` — rich club info (`getClubInfo`)

| Column | Type | GraphQL |
|---|---|---|
| `club_id` | `text` PK → `clubs` | `clubInfo.id` |
| `name` | `text` | |
| `vat_number` | `text` | `vatNumber` |
| `official_language` | `text` | `officialLanguage` |
| `website` | `text` | |
| `registration_number` | `text` | |
| `address` | `jsonb` | `{ streetName, postalCode, localityName }` |
| `nbr_stars` | `jsonb` | `{ stars, libelle }` |
| `discipline` | `jsonb` | array |
| `sport_level` | `jsonb` | `{ level, type }` |
| `venue` | `jsonb` | training/home venue object |
| `kits` | `jsonb` | full kits array |
| `contacts` | `jsonb` | full contacts array |
| `raw` | `jsonb` | full `clubInfo` |
| `synced_at` | `timestamptz` | |

#### `teams`

| Column | Type | GraphQL |
|---|---|---|
| `id` | `text` PK | team id |
| `club_id` | `text` FK → `clubs` | `clubId` |
| `name` | `text` | from `GetTeam` / `getTeamsInSeries` / calendars |
| `club_name` | `text` | denormalized when present |
| `logo` | `text` | |
| `complement` | `text` | e.g. `A` / `B` (`getTeamsInSeries`) |
| `registration_number` | `text` | from match detail teams when present |
| `raw` | `jsonb` | |
| `synced_at` | `timestamptz` | |

#### `series_teams`

| Column | Type | Notes |
|---|---|---|
| `series_id` | `text` FK | |
| `team_id` | `text` FK | |
| `club_id` | `text` | denormalized |
| `club_name` | `text` | |
| `complement` | `text` | |
| `logo` | `text` | |
| PK | `(series_id, team_id)` | from `getTeamsInSeries` |

#### `persons` — players **and** staff identities

IDs come from the API (`player.id`, `staff.id`, lineup `id`, staff `memberId`). Normalize carefully (see §3.5).

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | Canonical person id (see normalization) |
| `first_name` | `text` | |
| `last_name` | `text` | |
| `photo` | `text` | when available |
| `raw` | `jsonb` | last seen payload fragment |
| `first_seen_at` | `timestamptz` | |
| `last_seen_at` | `timestamptz` | |

#### `team_players` — squad membership (many teams per person)

| Column | Type | GraphQL / notes |
|---|---|---|
| `team_id` | `text` | |
| `person_id` | `text` | |
| `photo` | `text` | from `GetTeamMembers` |
| `stats_matches` | `int` | `statistics.numberOfMatches` |
| `stats_goals` | `int` | `numberOfGoals` |
| `stats_start` | `int` | `numberOfStart` |
| `stats_bench` | `int` | `numberOfBench` |
| `stats_yellow` | `int` | `numberOfYellow` |
| `stats_red` | `int` | `numberOfRed` |
| `stats_yellow_red` | `int` | `numberOfYellowRed` |
| `source` | `text` | `team_members` \| `match_lineup` \| `match_events` |
| `raw` | `jsonb` | |
| `synced_at` | `timestamptz` | |
| PK | `(team_id, person_id)` | **allows same person on A + B team** |

#### `team_staff`

| Column | Type | GraphQL |
|---|---|---|
| `team_id` | `text` | |
| `person_id` | `text` | |
| `functions` | `text[]` | `function` (API often returns array, e.g. `T1`) |
| `photo` | `text` | |
| `source` | `text` | `team_members` \| `match_staff` |
| `raw` | `jsonb` | |
| PK | `(team_id, person_id)` | |

#### `venues`

| Column | Type | GraphQL `location` |
|---|---|---|
| `id` | `text` PK | `location.id` |
| `name` | `text` | |
| `city` | `text` | |
| `postal_code` | `text` | |
| `address` | `text` | |
| `pitch_code` | `text` | |
| `synthetic` | `boolean` | |
| `raw` | `jsonb` | |

#### `matches`

| Column | Type | GraphQL |
|---|---|---|
| `id` | `text` PK | match id |
| `series_id` | `text` | `series.id` |
| `series_name` | `text` | denormalized |
| `title` | `text` | match detail |
| `channel` | `text` | |
| `event_type` | `text` | `eventType` (championship, friendly, …) |
| `state` | `text` | `planned` \| `finished` \| … |
| `start_time` | `timestamptz` | parse `startTime` as local/naive → store UTC |
| `home_team_id` | `text` | |
| `away_team_id` | `text` | |
| `home_team_name` | `text` | denormalized |
| `away_team_name` | `text` | |
| `home_club_id` | `text` | |
| `away_club_id` | `text` | |
| `home_goals` | `int` | `outcome.homeTeamGoals` |
| `away_goals` | `int` | `outcome.awayTeamGoals` |
| `home_penalties` | `int` | |
| `away_penalties` | `int` | |
| `outcome_status` | `text` | `outcome.status` |
| `outcome_subscript` | `text` | |
| `is_finished` | `boolean` | |
| `has_penalties` | `boolean` | |
| `has_subscript` | `boolean` | |
| `show_score` | `boolean` | |
| `start_date_time_in_the_passed` | `boolean` | |
| `age_group` | `text` | |
| `venue_id` | `text` FK nullable | |
| `detail_synced_at` | `timestamptz` | null until `GetMatchDetail` applied |
| `calendar_synced_at` | `timestamptz` | |
| `raw_calendar` | `jsonb` | last calendar row |
| `raw_detail` | `jsonb` | last match detail |
| `content_hash` | `text` | hash of score/state/start for change detection |

Indexes: `(series_id, start_time)`, `(state)`, `(detail_synced_at)` where null and finished.

#### `match_officials`

| Column | Type |
|---|---|
| `match_id` | `text` |
| `ord` | `int` |
| `first_name` | `text` |
| `last_name` | `text` |
| `function` | `text` |
| `status` | `text` |
| `person_assigned` | `boolean` / `text` as API gives |
| `raw` | `jsonb` |
| PK | `(match_id, ord)` |

#### `match_lineup_players`

| Column | Type | Notes |
|---|---|---|
| `match_id` | `text` | |
| `team_side` | `text` | `home` \| `away` |
| `slot` | `int` | row index in grouped lineup |
| `person_id` | `text` | lineup player `id` |
| `team_id` | `text` | home/away team id |
| `shirt_number` | `text` | |
| `badges` | `text` | e.g. `(C)` |
| `is_substitute` | `boolean` | false for starters |
| `player_events` | `jsonb` | per-player events on lineup fragment |
| `raw` | `jsonb` | |
| PK | `(match_id, team_side, person_id, is_substitute)` | |

#### `match_staff_lineup`

| Column | Type | Notes |
|---|---|---|
| `match_id` | `text` | |
| `team_side` | `text` | |
| `person_id` | `text` | normalized from `memberId` |
| `team_id` | `text` | |
| `function` | `text` | |
| `minute_red` | `int` | |
| `minute_yellow` | `int` | |
| `minute_yellow_red` | `int` | |
| `raw` | `jsonb` | |
| PK | `(match_id, team_side, person_id)` | |

#### `match_events`

Timeline rows (cards, subs, goals when present).

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` PK | |
| `match_id` | `text` | |
| `minute` | `int` | group minute |
| `team_side` | `text` | `home` \| `away` |
| `person_id` | `text` nullable | often **missing** in API events |
| `first_name` | `text` | |
| `last_name` | `text` | |
| `team_id` | `text` | from event `teamId` |
| `kind` | `text` | `goal`, `yellow`, `red`, `in`, `out`, `og`, `penalty`, … |
| `raw` | `jsonb` | |

Known kinds from site i18n: `goal` / `goalScored`, `og` / `owngoal`, `penalty` / `penaltymiss`, `yellow`, `red`, `yellowred`, `in`, `out`.  
**Score always comes from `matches.home_goals/away_goals`**, not only from events.

#### `match_shootout`

| Column | Type |
|---|---|
| `match_id` | `text` |
| `ord` | `int` |
| `last_name` | `text` |
| `first_name` | `text` |
| `is_scored` | `boolean` |
| `home_score` | `int` |
| `away_score` | `int` |
| `is_home` | `boolean` |
| `raw` | `jsonb` |

#### `ranking_snapshots` — store every ranking fetch (gameweek history)

API has no historical API; **we create history by snapshotting**.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` PK | |
| `series_id` | `text` | |
| `captured_at` | `timestamptz` | |
| `ranking_type` | `text` | e.g. `generalRanking`, `firstPeriodRanking`, … |
| `visibility` | `jsonb` | `{ showRanking, showFairplay }` |
| `payload` | `jsonb` | full `rankings[].teams[]` |
| `payload_hash` | `text` | skip insert if unchanged |
| `matchday_key` | `text` | e.g. `sum(matchesPlayed)` on general table |
| `series_name` | `text` | |
| `channel` | `text` | |
| `raw` | `jsonb` | full `seriesRankings` |

Unique optional: `(series_id, ranking_type, payload_hash)` to avoid duplicates.

#### `sync_runs` — observability

| Column | Type |
|---|---|
| `id` | `bigserial` PK |
| `trigger` | `text` | `local_seed` \| `github_actions` |
| `started_at` | `timestamptz` |
| `finished_at` | `timestamptz` |
| `status` | `text` | `running` \| `ok` \| `error` |
| `stats` | `jsonb` | counts of upserts, API calls, errors |
| `error` | `text` | |

#### `sync_checkpoints` (optional but useful)

| Column | Type |
|---|---|
| `key` | `text` PK | e.g. `last_successful_poll` |
| `value` | `jsonb` | |
| `updated_at` | `timestamptz` | |

### 1.3 Person ID normalization (critical)

The API is inconsistent:

| Source | ID shape | Example |
|---|---|---|
| `GetTeamMembers` players | numeric string | `1127582` |
| Match lineup players | numeric string | `1308190` |
| `GetTeamMembers` staff | often `{memberId}_{teamId}` | `149905_362663` |
| Match `staffLineup` | `memberId` only | `149905` |

**Rules:**

1. Players: use API `id` as `persons.id`.
2. Staff: prefer bare `memberId` when present; if only `149905_362663`, strip `_{teamId}` suffix when it matches the team.
3. Always upsert `team_players` / `team_staff` with `(team_id, person_id)` so multi-team membership is preserved.
4. If an event has only a name (no id), store the event anyway; try to resolve `person_id` later by `(team_id, first_name, last_name)` soft match — never invent fake IDs.

---

## 2. Local seed (run on your machine)

### 2.1 Prerequisites

1. Neon database + pooled `DATABASE_URL`.
2. Apply migrations for §1 schema.
3. Config file, e.g. `sync/series.json`:

```json
{
  "language": "nl",
  "seasonStart": "2026-07-01",
  "seasonEnd": "2027-06-30",
  "seriesIds": [
    "CHP_130005",
    "CHP_136335"
  ]
}
```

4. Local runner (to implement):  
   `node scripts/voetbal-vlaanderen/seed.mjs --config sync/series.json`  
   (or `npm run sync:seed` once scripted)

5. Concurrency: start with **5–10** parallel GraphQL calls; backoff on errors.

6. Idempotent upserts everywhere (`ON CONFLICT … DO UPDATE`).

### 2.2 Seed phases (exact order)

```text
Phase 0  open sync_runs (trigger=local_seed)
Phase 1  register sync_series rows
Phase 2  series metadata
Phase 3  teams in each series
Phase 4  full-season calendars → matches (+ provisional clubs/teams)
Phase 5  clubs enrichment (getClub + getClubInfo)
Phase 6  optional: getClubTeams for each club
Phase 7  GetTeam + GetTeamMembers for each team
Phase 8  GetMatchDetail for every match that is finished (or ongoing)
Phase 9  GetSeriesRankings snapshots
Phase 10 close sync_runs with stats
```

---

### Phase 1 — Register series

**Local only (no GraphQL).**

- Upsert each id into `sync_series` with `season_start` / `season_end`.

---

### Phase 2 — Series metadata

**Call:** `GetSeriesDetail`

```graphql
variables: { seriesId, language: "nl" }
```

**Returns:** `series { id, name, channel, showRanking, showScore, ageGroup, hasFairplayRanking }`

**Write:** upsert `series` (+ `raw`).

**Repeat:** once per configured `seriesId` (can alias/batch several in one HTTP request).

---

### Phase 3 — Teams in series

**Call:** `getTeamsInSeries`

```graphql
variables: { seriesId, language: "nl" }
```

**Returns:** `teamsInSeries[]` each:

- `id` (team id)
- `clubId`, `clubName`
- `logo`, `complement`

**Write:**

1. Upsert stub `clubs` (`id`, `name=clubName`, `logo` if any).
2. Upsert `teams` (`id`, `club_id`, `name` if known, `complement`, `logo`, `club_name`).
3. Upsert `series_teams`.

**Info gained:** complete roster of clubs/teams that belong to the competition (even before any match).

---

### Phase 4 — Full-season calendars

**Call:** `GetSeriesCalendar` (prefer **one aliased HTTP request** for all series)

```graphql
variables per series: {
  seriesId,
  startDate: seasonStart,   # "2026-07-01"
  endDate: seasonEnd,       # "2027-06-30"
  language: "nl"
}
```

**Returns:** `seriesCalendar[]` each match with:

- `id`, `state`, `startTime`, `channel`
- `homeTeam` / `awayTeam` `{ id, name, clubId, logo }`
- `outcome` `{ status, homeTeamGoals, awayTeamGoals, penalties… }`
- `series` `{ id, name }`
- `officials[]` (often incomplete vs detail)
- `showScore`, `startDateTimeInThePassed`

**Also request if desired (safe extras):** `eventType`, `ageGroup`, `outcome.isFinished`  
**Do not rely on** `lineup` / `events` on this call (API returns null / errors).

**Write:**

1. Upsert clubs/teams stubs from home/away.
2. Upsert `matches` from calendar fields → set `calendar_synced_at`, `raw_calendar`, `content_hash`.
3. Optionally store calendar officials in `match_officials` with a `source=calendar` flag in `raw` (detail phase overwrites).

**Info gained:** every fixture in the season window (~200–250 matches/series typical), including planned kickoffs and any early scores.

**Verified:** 35 series × full season ≈ **~7900 matches in ~3s**, ~2.7 MB JSON.

---

### Phase 5 — Club enrichment

For each distinct `club_id` collected in phases 3–4:

#### 5a. `getClub`

```graphql
variables: { clubId, language: "nl" }
```

**Returns:** `club { id, name, registrationNumber, logo, typLigue }`

**Write:** upsert `clubs`.

#### 5b. `getClubInfo`

```graphql
variables: { clubId, language: "nl" }
```

**Returns:** address, VAT, website, stars, discipline, sportLevel, venue, kits[], contacts[]

**Write:** upsert `club_profiles` (all nested structures in jsonb columns + `raw`).

---

### Phase 6 — Optional club teams listing

**Call:** `getClubTeams`

```graphql
variables: { clubId, language: "nl" }
```

**Returns:** all ploegen under the club (`id`, `clubId`, `name`, `discipline`) — including youth not in our series.

**Write:** upsert `teams` (may create teams outside `series_teams`; that is intentional for “store as much as possible”).

---

### Phase 7 — Team header + squad / staff

For each distinct `team_id` in scope (at least all `series_teams`):

#### 7a. `GetTeam`

```graphql
variables: { teamId, language: "nl" }
```

**Returns:** `team { id, name, clubName, clubId, logo }`

**Write:** upsert `teams`.

#### 7b. `GetTeamMembers`

```graphql
variables: { teamId, language: "nl" }
```

**Returns:**

```text
teamMembers {
  players[] { id, lastName, firstName, photo, statistics { … } }
  staff[]   { id, lastName, firstName, function, photo }
}
```

**Write:**

1. Upsert `persons` for each player/staff.
2. Upsert `team_players` with stats (`source=team_members`).
3. Upsert `team_staff` (`source=team_members`).

**Important:** many amateur teams return **empty** arrays until squads are published. Seed must tolerate that; match details will create players later (§3.5).

---

### Phase 8 — Match details (lineups, events, venue)

For each match where `state` ∈ {`finished`, `ongoing`} (and any other non-planned states you care about):

**Call:** `GetMatchDetail`

```graphql
variables: { matchId, language: "nl" }
```

**Returns (full useful surface):**

| Block | Contents |
|---|---|
| Header | `id`, `title`, `startTime`, `channel`, `eventType`, `state`, `ageGroup`, `showScore` |
| Series | `series { id, name }` |
| Venue | `location { id, name, city, postalCode, address, pitchCode, synthetic }` |
| Teams | home/away `{ id, name, registrationNumber, clubId, logo }` |
| Score | `outcome { goals, penalties, subscript, isFinished, hasPenalties, … }` |
| Officials | names, function, status |
| Lineup | paired home/away starters with `id`, shirt, badges, mini-events |
| Substitutes | same shape |
| Staff | `memberId`, function, card minutes |
| Events | timeline by minute + `kind` |
| Shootout | penalty sequence if any |

**Write (transaction per match recommended):**

1. Upsert `venues`.
2. Update `matches` score/state/venue + `raw_detail` + `detail_synced_at`.
3. Replace children: officials, lineup, subs, staff lineup, events, shootout.
4. **Person discovery (§3.5):** for every lineup/sub/staff id → upsert `persons` + `team_players` / `team_staff` for that match’s team (`source=match_lineup` / `match_staff`).

**Info gained:** everything needed for a match page; first appearance of many players.

Skip planned matches at seed time (no lineups yet). Mark `detail_synced_at` null until update job fills them after the whistle.

---

### Phase 9 — Rankings

For each series:

**Call:** `GetSeriesRankings`

```graphql
variables: { seriesId, language: "nl" }
```

**Returns:** `seriesRankings` or `null`

When non-null:

- `visibility { showRanking, showFairplay }`
- `rankings[] { type, teams[] { teamId, name, position, clubId, points, matchesPlayed, W/D/L, GF/GA/GD, fairplayPercentage, … } }`

Types include `generalRanking`, `firstPeriodRanking`, … `seventhPeriodRanking`.

**Write:** insert `ranking_snapshots` rows (one per `type`) with `payload_hash`. If `null` (season not started), log and continue.

---

### Phase 10 — Seed summary

Close `sync_runs` with stats, e.g.:

```json
{
  "series": 35,
  "clubs": 348,
  "teams": 442,
  "matches": 7902,
  "matchDetails": 120,
  "persons": 800,
  "rankingSnapshots": 0,
  "apiCalls": 1200
}
```

Re-running seed must be safe (upserts only).

---

## 3. Ongoing updates (GitHub Actions)

### 3.1 Schedule (`Europe/Brussels`)

| When | Frequency | Cron (with `timezone: Europe/Brussels`) |
|---|---|---|
| **Friday** | Every hour **21:00, 22:00, 23:00** | `0 21-23 * * 5` |
| **Saturday** | Every **30 min** **21:00–23:30** | `0,30 21-23 * * 6` |
| **Sunday** | Every **30 min** **16:00–21:00** | `0,30 16-21 * * 0` |
| **Mon–Thu** | Once at **00:00** (midnight) | `0 0 * * 1-4` |

Interpretation notes:

- “Between 21:00 and 24:00” → last Friday/Saturday slot is **23:00** / **23:30**, not a second daily midnight job.
- “Other days … on 24:00” → **Monday–Thursday 00:00**.
- Sunday includes **21:00** as the last half-hour slot.

Example workflow sketch:

```yaml
name: rbfa-sync
on:
  schedule:
    - cron: '0 21-23 * * 5'      # Fri hourly 21–23
    - cron: '0,30 21-23 * * 6'   # Sat half-hourly 21–23:30
    - cron: '0,30 16-21 * * 0'   # Sun half-hourly 16–21
    - cron: '0 0 * * 1-4'        # Mon–Thu midnight
  workflow_dispatch: {}

# GitHub supports timezone on schedule in recent Actions — set Europe/Brussels
# If your org only supports UTC, convert these crons for CET/CEST carefully.

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: node scripts/voetbal-vlaanderen/update.mjs
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Actions caveats: schedules are best-effort; may drift slightly; disabled after long repo inactivity.

### 3.2 Update pipeline (every run — same logic)

```text
A. Start sync_runs (trigger=github_actions)
B. Load enabled sync_series
C. POLL calendars (narrow window)
D. DIFF vs Neon matches → list of changed / new / newly finished
E. For each needs_detail match → GetMatchDetail → upsert + discover persons
F. For each series with finished changes (or nightly) → GetSeriesRankings snapshot
G. Nightly-only extras (Mon–Thu 00:00): refresh GetTeamMembers for all teams in scope
H. Finish sync_runs
```

Match-day hourly/half-hourly runs **skip** heavy `GetTeamMembers` refresh unless you want it (optional flag). Midnight runs **do** squad refresh.

---

### Step C — Calendar poll

**Call:** aliased `GetSeriesCalendar` for **all** enabled series in **one** HTTP request.

**Window:**

- Match-day runs: `today - 1 day` → `today + 14 days` (covers postponements + upcoming).
- Midnight runs: same, **or** full `seasonStart`→`seasonEnd` once per night to catch newly published distant fixtures (recommended nightly).

**Returns:** same calendar shape as seed phase 4 (ids, state, kickoff, teams, scores, …).

**Write:** upsert `matches`; update `content_hash`.

**Result examples:**

- New row → match newly appeared in calendar.
- `state: planned → finished` + goals filled → match completed.
- `startTime` changed → postponement/reschedule.
- Goals changed after finish → late correction → re-queue detail.

---

### Step D — Diff rules

A match **needs `GetMatchDetail`** when any of:

1. `state` changed to `finished` or `ongoing`
2. `home_goals` / `away_goals` / penalties changed
3. `state` is finished/ongoing AND `detail_synced_at` is null
4. finished AND `detail_synced_at` older than 2 hours AND last run saw a score change (late events)
5. Nightly: finished matches with `detail_synced_at` null (catch-up)

Planned matches: calendar upsert only (no detail call).

---

### Step E — Match detail + player creation

**Call:** `GetMatchDetail` per match in the needs-detail set (concurrency 5–10).

**Results & writes:** same as seed phase 8.

#### Player / staff first-seen logic (week 5 debut, etc.)

```text
for each starter / substitute in detail:
  personId = player.id
  upsert persons(id=personId, names, last_seen_at=now())
       on insert set first_seen_at=now()
  upsert team_players(team_id=that side's team, person_id=personId, source=match_lineup)
       # does NOT remove membership on other teams
```

Same for staff via `memberId` → `team_staff`.

**Multi-team example:**

- Player `1127582` already in `team_players` for first team `362663`.
- Same id appears in reserves match lineup for `362662`.
- → still one `persons` row; **second** `team_players` row for `362662`.
- Appearances/stats per team stay separate; never merge teams into one membership.

**Events without player id:** insert `match_events` with names only; optionally link later.

---

### Step F — Rankings

**When:**

- Any match in that series became finished this run, **or**
- Midnight daily run (always attempt)

**Call:** `GetSeriesRankings(seriesId)`

**If null:** no table yet — skip.

**If payload_hash ≠ last snapshot:** insert new `ranking_snapshots` rows (all `type`s returned).  
Set `matchday_key` e.g. to `sum(matchesPlayed)` of `generalRanking` so you can label “after N team-games played”.

**Result:** speeldag / periode history lives entirely in your DB.

---

### Step G — Squad refresh (midnight Mon–Thu, optional on Sundays)

**Call:** `GetTeamMembers` for each team in `series_teams`.

**Write:** upsert persons + `team_players` / `team_staff` with fresh statistics.

New players who only appear in the squad list (never played) get created here; players who only appear in lineups get created in step E. Both paths converge on the same `persons` / `team_players` keys.

---

### Step H — What one match-day half-hour run typically does

Example Saturday 21:30:

| Call | Count (order of magnitude) | Purpose |
|---|---|---|
| 1× aliased `GetSeriesCalendar` | 1 HTTP | scores + new fixtures |
| `GetMatchDetail` | 0–40 | only changed/finished |
| `GetSeriesRankings` | 0–35 | series that had finishes |
| Neon upserts | batch | |

Wall clock: usually **well under 2 minutes** → fine for free Actions.

---

## 4. Call cheat sheet

| Operation | Variables | Primary tables filled |
|---|---|---|
| `GetSeriesDetail` | `seriesId` | `series` |
| `getTeamsInSeries` | `seriesId` | `clubs`, `teams`, `series_teams` |
| `GetSeriesCalendar` | `seriesId`, `startDate`, `endDate` | `matches`, stubs clubs/teams |
| `getClub` | `clubId` | `clubs` |
| `getClubInfo` | `clubId` | `club_profiles` |
| `getClubTeams` | `clubId` | `teams` |
| `GetTeam` | `teamId` | `teams` |
| `GetTeamMembers` | `teamId` | `persons`, `team_players`, `team_staff` |
| `GetMatchDetail` | `matchId` | `matches`, venue, lineups, events, officials, **new persons** |
| `GetSeriesRankings` | `seriesId` | `ranking_snapshots` |

---

## 5. Implementation checklist

- [ ] Neon schema migrations (§1)
- [ ] `sync/series.json` with your series IDs
- [ ] Local `seed.mjs` implementing phases 1–10
- [ ] Local dry-run against a Neon branch
- [ ] `update.mjs` implementing §3.2
- [ ] GitHub Action with Brussels schedule + `DATABASE_URL` secret
- [ ] Manual `workflow_dispatch` test
- [ ] Verify: player appears only in week 5 lineup → row created; same player on B-team → second `team_players` row

---

## 6. Explicit non-goals / API gaps (still store what we can)

| Gap | How we cope |
|---|---|
| No lineup on calendar | Always `GetMatchDetail` |
| Rankings `null` pre-season | Snapshot when available |
| No historical rankings API | `ranking_snapshots` |
| Empty `teamMembers` | Create persons from match lineups |
| Goal events sometimes missing | Trust `outcome` goals columns |
| No introspection | Stick to known queries in `scripts/voetbal-vlaanderen/queries/` |
