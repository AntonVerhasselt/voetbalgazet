/**
 * Thin client for the public RBFA / Voetbal Vlaanderen GraphQL API.
 *
 * Endpoint: https://datalake-prod2018.rbfa.be/graphql
 * Auth: none (send Origin/Referer like the website)
 *
 * Prefer full queries from ./queries/*.graphql (stable across frontend deploys).
 * Persisted-query hashes in ops.json are what the live site sends today.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENDPOINT = "https://datalake-prod2018.rbfa.be/graphql";
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "*/*",
  Origin: "https://www.voetbalvlaanderen.be",
  Referer: "https://www.voetbalvlaanderen.be/",
  "User-Agent": "DeVoetbalgazet/0.1 (+research client)",
};

const ops = JSON.parse(readFileSync(join(__dirname, "ops.json"), "utf8"));

function loadQuery(operationName) {
  const path = join(__dirname, "queries", `${operationName}.graphql`);
  return readFileSync(path, "utf8");
}

/**
 * @param {string} operationName
 * @param {Record<string, unknown>} variables
 * @param {{ usePersistedHash?: boolean }} [options]
 */
export async function graphql(operationName, variables, options = {}) {
  const body = {
    operationName,
    variables,
  };

  if (options.usePersistedHash) {
    const meta = ops.persistedQueries[operationName];
    if (!meta) {
      throw new Error(`No persisted hash for ${operationName}`);
    }
    body.extensions = {
      persistedQuery: { version: 1, sha256Hash: meta.sha256Hash },
    };
  } else {
    body.query = loadQuery(operationName);
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from GraphQL endpoint`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join("; ");
    throw new Error(`GraphQL errors: ${msg}`);
  }
  return json.data;
}

export const api = {
  getTeam: (teamId, language = "nl") =>
    graphql("GetTeam", { teamId: String(teamId), language }),

  getTeamCalendar: (teamId, { language = "nl", sortByDate = "asc" } = {}) =>
    graphql("GetTeamCalendar", {
      teamId: String(teamId),
      language,
      sortByDate,
    }),

  getUpcomingMatch: (teamId, language = "nl") =>
    graphql("GetUpcomingMatch", { teamId: String(teamId), language }),

  getLastPlayedMatch: (teamId, language = "nl") =>
    graphql("GetLastPlayedMatch", { teamId: String(teamId), language }),

  getMatchDetail: (matchId, language = "nl") =>
    graphql("GetMatchDetail", { matchId: String(matchId), language }),

  getSeriesDetail: (seriesId, language = "nl") =>
    graphql("GetSeriesDetail", { seriesId: String(seriesId), language }),

  /** Week/month window — most efficient competition calendar fetch. */
  getSeriesCalendar: (
    seriesId,
    startDate,
    endDate,
    language = "nl",
  ) =>
    graphql("GetSeriesCalendar", {
      seriesId: String(seriesId),
      startDate,
      endDate,
      language,
    }),

  /** Compact upcoming/previous slice (site homepage widget style). */
  getSeriesCalendarSmall: (
    seriesId,
    getUpcomingGames,
    language = "nl",
  ) =>
    graphql("GetSeriesCalendarSmall", {
      seriesId: String(seriesId),
      getUpcomingGames: Boolean(getUpcomingGames),
      language,
    }),

  getSeriesRankings: (seriesId, language = "nl") =>
    graphql("GetSeriesRankings", { seriesId: String(seriesId), language }),

  getClub: (clubId, language = "nl") =>
    graphql("getClub", { clubId: String(clubId), language }),

  getClubInfo: (clubId, language = "nl") =>
    graphql("getClubInfo", { clubId: String(clubId), language }),

  getClubTeams: (clubId, language = "nl") =>
    graphql("getClubTeams", { clubId: String(clubId), language }),

  getTeamsInSeries: (seriesId, language = "nl") =>
    graphql("getTeamsInSeries", { seriesId: String(seriesId), language }),

  getTeamSeriesAndRankings: (teamId, language = "nl") =>
    graphql("getSeriesAndRankingsQuery", {
      teamId: String(teamId),
      language,
    }),
};

export { ENDPOINT, ops };
