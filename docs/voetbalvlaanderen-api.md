# Voetbal Vlaanderen / RBFA — efficient football data fetch plan

How to pull calendars, matches, clubs, and competitions **without** driving a
browser every time — same idea as recording network traffic → deriving a client.

## Verdict

Use the public GraphQL API directly:

| | |
|---|---|
| **Endpoint** | `POST https://datalake-prod2018.rbfa.be/graphql` |
| **Auth** | None (no API key / cookie required) |
| **Headers** | `Content-Type: application/json`, plus `Origin` / `Referer` from `https://www.voetbalvlaanderen.be` |
| **Style** | Apollo persisted queries on the website; **full query documents also work** |

Do **not** scrape HTML. One POST returns structured JSON for the same data the site shows.

## URL → IDs

| Page | Example | IDs |
|---|---|---|
| Team calendar | `/club/1553/ploeg/362663/kalender` | `clubId=1553`, `teamId=362663` |
| Match | `/wedstrijd/7567807` | `matchId=7567807` |
| Competition | `/competitie/CHP_132090/overzicht` | `seriesId=CHP_132090` |

Series IDs look like `CHP_*` (championship), `CUP_*` (cup), `FRN_*` (friendly / other).

## Recommended operations (efficient plan)

### Team-centric (club pages, “our next matches”)

1. **`getClubTeams(clubId)`** — list all teams (1st, reserves, youth, women).
2. **`GetTeamCalendar(teamId)`** — full season-ish fixture list for one team (**best single call** for a ploeg kalender).
3. **`GetUpcomingMatch` / `GetLastPlayedMatch`** — widgets only; skip if you already call the calendar.
4. **`getSeriesAndRankingsQuery(teamId)`** — which series the team is in (+ rankings when available).

### Competition-centric (league overview)

1. **`GetSeriesDetail(seriesId)`** — name, `showRanking`, `showScore`, age group.
2. **`GetSeriesCalendar(seriesId, startDate, endDate)`** — **best call for competition fixtures** (date window; we got 21 matches for CPL Aug 2026 in one request).
3. **`GetSeriesCalendarSmall(seriesId, getUpcomingGames)`** — small upcoming/previous slice only (site tab widgets).
4. **`GetSeriesRankings(seriesId)`** — standings (`points`, `matchesPlayed`, W/D/L, GD, …). Returns `null` when the season has no table yet (observed Jul 2026 for CPL).
5. **`getTeamsInSeries(seriesId)`** — clubs/teams in the series.

### Match detail

1. **`GetMatchDetail(matchId)`** — venue, officials, events, lineups, substitutes, staff, score flags.

### Club profile

1. **`getClub` / `getClubInfo`** — logo, address, contacts, kits, venue.

## Suggested sync strategy for De Voetbalgazet

For a Flemish local-football product, prefer **team + series calendars** over live browser control:

```text
nightly / on demand
  ├─ for each watched clubId
  │    getClubTeams → teamIds
  │    for each teamId → GetTeamCalendar
  ├─ for each watched seriesId
  │    GetSeriesCalendar(start=today-7d, end=today+60d)  // or rolling month windows
  │    GetSeriesRankings (when showRanking)
  └─ for matches that need lineups / events
       GetMatchDetail(matchId)   // only for “featured” or kickoff±window
```

**Why this is efficient**

- ~1 request per team calendar covers dozens of fixtures (35 for Sporting Hasselt A in our capture).
- Competition month windows beat scraping week tabs in the UI.
- Match detail is optional and heavy — call only when you need lineups/events.

## Client in this repo

```bash
# Team calendar (pretty)
node scripts/voetbal-vlaanderen/cli.mjs team-calendar 362663

# Match detail (lineups)
node scripts/voetbal-vlaanderen/cli.mjs match 7567807

# Competition calendar for a month
node scripts/voetbal-vlaanderen/cli.mjs series-calendar CHP_132090 2026-08-01 2026-08-31

# Club teams
node scripts/voetbal-vlaanderen/cli.mjs club-teams 1553

# Raw JSON
node scripts/voetbal-vlaanderen/cli.mjs series-rankings CHP_132090 --raw
```

Programmatic:

```js
import { api } from "./scripts/voetbal-vlaanderen/client.mjs";

const { teamCalendar } = await api.getTeamCalendar("362663");
const { seriesCalendar } = await api.getSeriesCalendar(
  "CHP_132090",
  "2026-08-01",
  "2026-08-31",
);
```

Query documents live in `scripts/voetbal-vlaanderen/queries/`.  
Captured Apollo hashes (optional) live in `scripts/voetbal-vlaanderen/ops.json`.

**Prefer full queries** over persisted hashes — hashes are tied to the current frontend build and can rotate.

## Caveats

- **Scores**: friendlies / `showScore: false` often have `homeTeamGoals: null` even when `state: finished`. Competitive fixtures with `showScore: true` return goals (verified on `FRN_874` previous games).
- **Rankings**: `null` until the competition publishes a table (`showRanking` on series detail). Types include `generalRanking` and `firstPeriodRanking`…`seventhPeriodRanking` (Belgian periodes — not gameweeks).
- **`GetSeriesCalendarSmall(getUpcomingGames: false)`** can be `null` for some series; use **`GetSeriesCalendar` with dates** for reliability.
- **Calendar ≠ match detail**: you can request `lineup`/`events` on `seriesCalendar`, but resolvers return `null` and error. Always use `GetMatchDetail` for lineups/events.
- **Aliasing**: one HTTP request can include calendars for many series (35 verified).
- **Full season window**: `GetSeriesCalendar` accepts ~1 year ranges (210–240 matches observed) with no pagination.
- **Squads**: `GetTeamMembers` works for some teams (e.g. pro first team) and returns empty for many others.
- **Rate limits**: none observed (50 sequential match details OK); still throttle bulk syncs.
- **Introspection**: disabled on the endpoint.
- **ToS**: public unauthenticated API used by the website; for production-scale ingestion, confirm with Voetbal Vlaanderen / RBFA if needed.
- **CDN hostname**: DevTools may show an Akamai edge host (`datalake-prod2018-i04.be`); the stable API host in requests is **`datalake-prod2018.rbfa.be`**.

## Full DB copy + live updates

For duplicating ~35 series into **Neon** and keeping scores/lineups/rankings fresh via **Vercel Functions**, see:

→ [`voetbalvlaanderen-sync-architecture.md`](./voetbalvlaanderen-sync-architecture.md)

## How this was discovered

Computer-use browsing of:

1. https://www.voetbalvlaanderen.be/club/1553/ploeg/362663/kalender  
2. https://www.voetbalvlaanderen.be/wedstrijd/7567807  
3. https://www.voetbalvlaanderen.be/competitie/CHP_132090/overzicht  

HAR captures + extraction of GraphQL query documents from the site JS bundles (`main.*.js` and lazy chunks). Live POSTs confirmed the operations below.

## Operation cheat sheet

| Operation | Variables | Returns |
|---|---|---|
| `GetTeamCalendar` | `teamId`, `language`, `sortByDate` | Match list for team |
| `GetSeriesCalendar` | `seriesId`, `startDate`, `endDate`, `language` | Match list in window |
| `GetSeriesCalendarSmall` | `seriesId`, `language`, `getUpcomingGames` | Small upcoming/previous list |
| `GetMatchDetail` | `matchId`, `language` | Full match + lineups |
| `GetSeriesRankings` | `seriesId`, `language` | Table or `null` |
| `GetSeriesDetail` | `seriesId`, `language` | Series metadata |
| `getClubTeams` | `clubId`, `language` | Teams under club |
| `getTeamsInSeries` | `seriesId`, `language` | Teams in series |
| `getClub` / `getClubInfo` | `clubId`, `language` | Club profile |
| `GetTeam` / upcoming / last | `teamId`, `language` | Team / single match widgets |
