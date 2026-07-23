#!/usr/bin/env npx tsx
/**
 * Dry-run: compare current code catalog + Convex taxonomy against live Neon.
 * No writes.
 */
import fs from "node:fs";
import pg from "pg";
import {
  generatedDivisionOptions,
  generatedNeonSeries,
  generatedTeamOptions,
} from "../convex/lib/generated/neonTaxonomyData";
import {
  applyLegacyTeamKey,
  buildSignupTeams,
  parseAllNeonSeries,
  provincialSignupDivisions,
} from "../convex/lib/neonSeriesNaming";

async function main(): Promise<void> {
  const url = process.env.NEON_DATABASE_URL?.trim();
  if (!url) throw new Error("NEON_DATABASE_URL is required");

  const pool = new pg.Pool({
    connectionString: url,
    max: 2,
    ssl: { rejectUnauthorized: true },
  });
  try {
    const seriesResult = await pool.query(
      "select id, name, age_group, channel from series order by name",
    );
    const teamsResult = await pool.query(
      `select st.team_id, st.club_id, st.club_name, st.complement,
              t.display_name, st.series_id
       from series_teams st
       join teams t on t.id = st.team_id
       join series s on s.id = st.series_id
       where s.name ~ '^[0-9] Provinciaal'
       order by coalesce(t.display_name, st.club_name), st.team_id`,
    );

    const neonSeries = seriesResult.rows as Array<{
      id: string;
      name: string;
      age_group: string | null;
      channel: string | null;
    }>;
    const neonIds = new Set(neonSeries.map((s) => s.id));
    const parsed = parseAllNeonSeries(neonSeries);
    const divisions = provincialSignupDivisions(parsed);
    const provincialByNeonId = new Map(
      divisions.map((d) => [d.neonSeriesId, d] as const),
    );
    const teams = buildSignupTeams(
      teamsResult.rows as Array<{
        team_id: string;
        club_id: string;
        club_name: string;
        complement: string | null;
        display_name: string | null;
        series_id: string;
      }>,
      provincialByNeonId,
    ).map(applyLegacyTeamKey);

    const currentSeriesIds = new Set(
      generatedNeonSeries.map((s) => s.neonSeriesId),
    );
    const currentDivKeys = new Set(generatedDivisionOptions.map((d) => d.key));
    const currentTeamKeys = new Set(generatedTeamOptions.map((t) => t.key));
    const nextDivKeys = new Set(divisions.map((d) => d.publicKey));
    const nextTeamKeys = new Set(teams.map((t) => t.key));
    const nextNeonTeamIds = new Set(teams.map((t) => t.neonTeamId));

    const seriesRemoved = generatedNeonSeries.filter(
      (s) => !neonIds.has(s.neonSeriesId),
    );
    const seriesAdded = parsed.filter(
      (s) => !currentSeriesIds.has(s.neonSeriesId),
    );
    const divsRemoved = generatedDivisionOptions.filter(
      (d) => !nextDivKeys.has(d.key),
    );
    const divsAdded = divisions.filter((d) => !currentDivKeys.has(d.publicKey));
    const teamsRemoved = generatedTeamOptions.filter(
      (t) => !nextTeamKeys.has(t.key),
    );
    const teamsAdded = teams.filter((t) => !currentTeamKeys.has(t.key));
    const teamsRemovedByNeonId = generatedTeamOptions.filter(
      (t) => !nextNeonTeamIds.has(t.neonTeamId),
    );

    const report = {
      summary: {
        neonSeriesNow: neonSeries.length,
        codeSeriesNow: generatedNeonSeries.length,
        seriesToRemoveFromCode: seriesRemoved.length,
        seriesToAddToCode: seriesAdded.length,
        codeDivisionsNow: generatedDivisionOptions.length,
        neonProvincialDivisions: divisions.length,
        divisionsToRemoveFromCode: divsRemoved.length,
        divisionsToAddToCode: divsAdded.length,
        codeTeamsNow: generatedTeamOptions.length,
        neonProvincialTeams: teams.length,
        teamsToRemoveFromCodeByKey: teamsRemoved.length,
        teamsToAddToCodeByKey: teamsAdded.length,
        teamsToRemoveByNeonId: teamsRemovedByNeonId.length,
      },
      seriesRemoved,
      seriesAdded: seriesAdded.map((s) => ({
        neonSeriesId: s.neonSeriesId,
        publicKey: s.publicKey,
        neonSeriesName: s.neonSeriesName,
        kind: s.kind,
      })),
      divisionsRemoved: divsRemoved,
      divisionsAdded: divsAdded.map((d) => ({
        key: d.publicKey,
        label: d.catalogLabel,
        shortLabel: d.shortLabel,
      })),
      teamsRemoved,
      teamsAdded: teamsAdded.map((t) => ({
        key: t.key,
        label: t.label,
        divisionKeys: [...t.divisionKeys],
        neonTeamId: t.neonTeamId,
      })),
    };

    fs.writeFileSync(
      "/tmp/cursor/cleanup-dry-run-report.json",
      JSON.stringify(report, null, 2),
    );

    console.log("=== DRY-RUN COMPARISON (code catalog ↔ Neon) ===");
    console.log(JSON.stringify(report.summary, null, 2));
    console.log("\nSERIES TO REMOVE FROM CODE (research map):");
    for (const s of seriesRemoved) {
      console.log(
        `  [${s.kind}] ${s.neonSeriesId}  ${s.publicKey}  — ${s.neonSeriesName}`,
      );
    }
    console.log(`\nSIGNUP DIVISIONS TO REMOVE: ${divsRemoved.length}`);
    for (const d of divsRemoved) {
      console.log(`  ${d.key}  — ${d.label}`);
    }
    console.log(`\nSIGNUP TEAMS TO REMOVE: ${teamsRemoved.length}`);
    for (const t of teamsRemoved.slice(0, 30)) {
      console.log(`  ${t.key}  — ${t.label}`);
    }
    if (teamsRemoved.length > 30) {
      console.log(`  … and ${teamsRemoved.length - 30} more`);
    }
    console.log("\nReport: /tmp/cursor/cleanup-dry-run-report.json");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
