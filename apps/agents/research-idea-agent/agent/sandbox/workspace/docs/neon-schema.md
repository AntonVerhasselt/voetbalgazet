# Neon football schema (research agent)

Read-only docs for the sandbox at `/workspace/docs/`. Introspected 2026-07-22
against the Voetbalgazet Neon database (`neondb`, user `research_user`).

## Connectivity

Env: `DATABASE_URL` / `NEON_DATABASE_URL` (injected by sandbox).

```ts
import { query } from "../lib/db.ts";
const r = await query("select 1 as ok");
```

**Rules:** only `SELECT`. Never invent ids or stats. Filter by `series_id`.

## Canonical series / divisionKey

Neon owns series identity via `series.id` (e.g. `CHP_130005`).

| series.id | name | Placeholder YAML key (temporary) |
|-----------|------|----------------------------------|
| `CHP_130005` | 1 Provinciaal Antw | `antwerpen-p1` |
| `CHP_136335` | 2 Provinciaal Antw A | `antwerpen-p2a` |
| `CHP_134688` | BvA Heren Groep 1 P1/P2 | _(none — Neon-only)_ |

**Target:** Pipeline `divisionKey` = Neon `series.id`. Until taxonomy migration
runs, the app accepts both placeholder keys and Neon ids (see
`convex/lib/neonSeriesMap.ts`).

Discover series:

```sql
select id, name, age_group, channel from series order by name;
```

## Tables (public)

### Identity / structure

- **`series`** — competition series (`id`, `name`, `channel`, `age_group`, …)
- **`series_teams`** — teams in a series (`series_id`, `team_id`, `club_id`, `club_name`, `complement`)
- **`clubs`** — clubs (`id`, `name`, `registration_number`, `logo`, `typ_ligue`)
- **`club_profiles`** — richer club profile JSON (address, kits, contacts, …)
- **`teams`** — club teams (`id`, `club_id`, `name`, `display_name`, `club_name`, `complement`)
- **`venues`** — match venues
- **`persons`** — people (`id`, `first_name`, `last_name`, `photo`, `raw`)

### Squads

- **`team_players`** — roster + season stats (`team_id`, `person_id`, `stats_goals`, `stats_matches`, `stats_start`, `stats_bench`, `stats_yellow`, `stats_red`, `active`, …)
- **`team_staff`** — staff (`team_id`, `person_id`, `functions` text[], `active`, …). Example functions: `T1`, `T2`.

### Matches & events

- **`matches`** — calendar + outcomes (`id`, `series_id`, `series_name`, `start_time`, `home_team_id`/`away_team_id`, names, club ids, `home_goals`/`away_goals`, `outcome_status`, `is_finished`, …)
- **`match_events`** — in-match events (`match_id`, `minute`, `team_side`, `person_id`, `first_name`, `last_name`, `team_id`, `kind`, `raw`)
- **`match_lineup_players`**, **`match_staff_lineup`**, **`match_officials`**, **`match_shootout`**

### Rankings

- **`ranking_snapshots`** — point-in-time tables (`series_id`, `captured_at`, `ranking_type`, `payload` jsonb, `matchday_key`, …)
- **`ranking_snapshot_teams`** — per-team rows for a snapshot

### Sync ops (ignore for editorial research)

- `sync_runs`, `sync_series`, `sync_checkpoints`

## Useful research queries

### Teams in a series

```sql
select st.team_id, st.club_id, st.club_name, st.complement, t.display_name
from series_teams st
join teams t on t.id = st.team_id
where st.series_id = $1
order by st.club_name;
```

### Active players with goals (series scope via team membership)

```sql
select p.id as neon_person_id,
       p.first_name || ' ' || p.last_name as full_name,
       tp.stats_goals, tp.stats_matches, tp.stats_start,
       t.id as neon_team_id, t.display_name as team_name,
       t.club_id as neon_club_id, t.club_name
from team_players tp
join persons p on p.id = tp.person_id
join teams t on t.id = tp.team_id
join series_teams st on st.team_id = t.id
where st.series_id = $1
  and tp.active = true
order by tp.stats_goals desc nulls last
limit 25;
```

### Staff (T1 trainers) for series teams

```sql
select p.id as neon_person_id,
       p.first_name || ' ' || p.last_name as full_name,
       ts.functions,
       t.club_id as neon_club_id, t.club_name,
       t.id as neon_team_id, t.display_name as team_name
from team_staff ts
join persons p on p.id = ts.person_id
join teams t on t.id = ts.team_id
join series_teams st on st.team_id = t.id
where st.series_id = $1
  and ts.active = true
  and 'T1' = any (ts.functions);
```

### Recent / upcoming matches

```sql
select id, start_time, home_team_name, away_team_name,
       home_goals, away_goals, outcome_status, is_finished
from matches
where series_id = $1
order by start_time desc
limit 40;
```

### Match events (when synced)

```sql
select me.minute, me.kind, me.team_side,
       me.first_name, me.last_name, me.person_id, m.home_team_name, m.away_team_name
from match_events me
join matches m on m.id = me.match_id
where m.series_id = $1
order by m.start_time desc, me.minute nulls last
limit 100;
```

## Interviewee mapping → IdeaBatch

| IdeaBatch field | Neon source |
|-----------------|-------------|
| `neonPersonId` | `persons.id` |
| `fullName` | `first_name \|\| ' ' \|\| last_name` |
| `contactType` | player ← `team_players`; staff ← `team_staff`; board/other only if evidenced |
| `contactTypeDetail` | e.g. `spits`, `T1-trainer` from functions / role |
| `neonClubId` / `clubName` | `teams.club_id` / `teams.club_name` |
| `neonTeamId` / `teamName` | `teams.id` / `teams.display_name` |

## Data caveats (as of introspection)

- Seed is **Antwerp-focused** (3 series). More provinces arrive as sync expands.
- Many matches are **planned** future fixtures; finished-match + event coverage may be sparse early season.
- Prefer queries that degrade gracefully (empty result → no invented facts).

## Sandbox workflow reminder

1. Confirm series id for the task.
2. Write scripts under `/workspace/research/`.
3. Run with `npx tsx research/….ts`.
4. Cite concrete rows in `supportingFacts[].evidence` and optional `sqlFingerprint`.
