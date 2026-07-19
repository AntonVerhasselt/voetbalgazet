#!/usr/bin/env node
/**
 * Voetbal Vlaanderen / RBFA GraphQL CLI (research / efficient fetch).
 *
 * Examples:
 *   node scripts/voetbal-vlaanderen/cli.mjs team-calendar 362663
 *   node scripts/voetbal-vlaanderen/cli.mjs match 7567807
 *   node scripts/voetbal-vlaanderen/cli.mjs series-calendar CHP_132090 2026-08-01 2026-08-31
 *   node scripts/voetbal-vlaanderen/cli.mjs club-teams 1553
 *   node scripts/voetbal-vlaanderen/cli.mjs search-open "fast food"   # alias: pretty team calendar sample
 */

import { api } from "./client.mjs";

function usage() {
  console.error(`Usage:
  node scripts/voetbal-vlaanderen/cli.mjs <command> [args...] [--raw]

Commands:
  team <teamId>
  team-calendar <teamId>
  upcoming <teamId>
  last-played <teamId>
  match <matchId>
  series <seriesId>
  series-calendar <seriesId> <startDate YYYY-MM-DD> <endDate YYYY-MM-DD>
  series-calendar-small <seriesId> <upcoming|previous>
  series-rankings <seriesId>
  club <clubId>
  club-info <clubId>
  club-teams <clubId>
  teams-in-series <seriesId>
  team-series <teamId>
`);
  process.exit(1);
}

function formatMatch(m) {
  if (!m) return null;
  const score =
    m.showScore && m.outcome?.homeTeamGoals != null
      ? ` ${m.outcome.homeTeamGoals}-${m.outcome.awayTeamGoals}`
      : "";
  return {
    id: m.id,
    when: m.startTime,
    home: m.homeTeam?.name,
    away: m.awayTeam?.name,
    series: m.series?.name ?? m.series?.id,
    state: m.state ?? m.outcome?.status,
    score: score.trim() || undefined,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const raw = argv.includes("--raw");
  const args = argv.filter((a) => a !== "--raw");
  const [cmd, ...rest] = args;
  if (!cmd) usage();

  let data;
  switch (cmd) {
    case "team":
      data = await api.getTeam(rest[0]);
      break;
    case "team-calendar": {
      const cal = await api.getTeamCalendar(rest[0]);
      data = raw
        ? cal
        : {
            count: cal.teamCalendar?.length ?? 0,
            matches: (cal.teamCalendar ?? []).map(formatMatch),
          };
      break;
    }
    case "upcoming":
      data = await api.getUpcomingMatch(rest[0]);
      break;
    case "last-played":
      data = await api.getLastPlayedMatch(rest[0]);
      break;
    case "match": {
      const detail = await api.getMatchDetail(rest[0]);
      if (raw) {
        data = detail;
      } else {
        const m = detail.matchDetail;
        data = {
          ...formatMatch(m),
          venue: m?.location,
          lineupHome: (m?.lineup ?? [])
            .map((row) => row.home)
            .filter(Boolean)
            .map((p) => `${p.shirtNumber} ${p.firstName} ${p.lastName}`),
          lineupAway: (m?.lineup ?? [])
            .map((row) => row.away)
            .filter(Boolean)
            .map((p) => `${p.shirtNumber} ${p.firstName} ${p.lastName}`),
          events: m?.events,
        };
      }
      break;
    }
    case "series":
      data = await api.getSeriesDetail(rest[0]);
      break;
    case "series-calendar": {
      const [seriesId, startDate, endDate] = rest;
      if (!seriesId || !startDate || !endDate) usage();
      const cal = await api.getSeriesCalendar(seriesId, startDate, endDate);
      data = raw
        ? cal
        : {
            count: cal.seriesCalendar?.length ?? 0,
            matches: (cal.seriesCalendar ?? []).map(formatMatch),
          };
      break;
    }
    case "series-calendar-small": {
      const upcoming = rest[1] !== "previous";
      const cal = await api.getSeriesCalendarSmall(rest[0], upcoming);
      data = raw
        ? cal
        : {
            count: cal.seriesCalendarSmall?.length ?? 0,
            matches: (cal.seriesCalendarSmall ?? []).map(formatMatch),
          };
      break;
    }
    case "series-rankings":
      data = await api.getSeriesRankings(rest[0]);
      break;
    case "club":
      data = await api.getClub(rest[0]);
      break;
    case "club-info":
      data = await api.getClubInfo(rest[0]);
      break;
    case "club-teams":
      data = await api.getClubTeams(rest[0]);
      break;
    case "teams-in-series":
      data = await api.getTeamsInSeries(rest[0]);
      break;
    case "team-series":
      data = await api.getTeamSeriesAndRankings(rest[0]);
      break;
    default:
      usage();
  }

  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
