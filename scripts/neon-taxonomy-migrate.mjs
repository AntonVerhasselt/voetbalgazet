#!/usr/bin/env node
/**
 * Dry-run (default) / execute taxonomy alignment toward Neon series.id keys.
 *
 * Usage:
 *   node scripts/neon-taxonomy-migrate.mjs              # dry-run
 *   node scripts/neon-taxonomy-migrate.mjs --dry-run
 *   node scripts/neon-taxonomy-migrate.mjs --execute    # REQUIRES explicit confirm env
 *
 * EXECUTE requires CONFIRM_TAXONOMY_MIGRATE=yes — never runs writes otherwise.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const execute = process.argv.includes("--execute");
const dryRun = !execute;

const PLACEHOLDER_TO_NEON = {
  "antwerpen-p1": {
    neonSeriesId: "CHP_130005",
    neonSeriesName: "1 Provinciaal Antw",
  },
  "antwerpen-p2a": {
    neonSeriesId: "CHP_136335",
    neonSeriesName: "2 Provinciaal Antw A",
  },
};

async function loadNeonSeries(url) {
  const pool = new pg.Pool({
    connectionString: url,
    max: 2,
    ssl: { rejectUnauthorized: true },
  });
  try {
    const result = await pool.query(
      "select id, name, age_group, channel from series order by name",
    );
    return result.rows;
  } finally {
    await pool.end();
  }
}

function loadYamlDivisions() {
  const file = path.join(
    root,
    "apps/web/content/settings/divisions.yaml",
  );
  const text = fs.readFileSync(file, "utf8");
  const keys = [...text.matchAll(/key:\s*([a-z0-9-]+)/g)].map((m) => m[1]);
  return { file, keys };
}

async function main() {
  const url = process.env.NEON_DATABASE_URL?.trim();
  if (!url) {
    console.error("NEON_DATABASE_URL is required");
    process.exit(1);
  }

  console.log(dryRun ? "=== DRY RUN ===" : "=== EXECUTE ===");

  const neonSeries = await loadNeonSeries(url);
  const yaml = loadYamlDivisions();

  console.log(`\nNeon series (${neonSeries.length}):`);
  for (const s of neonSeries) {
    console.log(`  ${s.id}  ${s.name}`);
  }

  console.log(`\nYAML division keys (${yaml.keys.length}) in ${yaml.file}`);

  const planned = [];
  for (const [placeholder, neon] of Object.entries(PLACEHOLDER_TO_NEON)) {
    const inYaml = yaml.keys.includes(placeholder);
    const inNeon = neonSeries.some((s) => s.id === neon.neonSeriesId);
    planned.push({
      action: "remap_external_key",
      from: placeholder,
      to: neon.neonSeriesId,
      label: neon.neonSeriesName,
      inYaml,
      inNeon,
    });
  }

  const neonOnly = neonSeries.filter(
    (s) =>
      !Object.values(PLACEHOLDER_TO_NEON).some((m) => m.neonSeriesId === s.id),
  );
  for (const s of neonOnly) {
    planned.push({
      action: "add_neon_series",
      from: null,
      to: s.id,
      label: s.name,
      inYaml: false,
      inNeon: true,
    });
  }

  const unmappedYaml = yaml.keys.filter((k) => !(k in PLACEHOLDER_TO_NEON));
  console.log(`\nPlanned changes (${planned.length}):`);
  for (const p of planned) {
    console.log(
      `  ${p.action}: ${p.from ?? "(new)"} → ${p.to} (${p.label}) [yaml=${p.inYaml} neon=${p.inNeon}]`,
    );
  }
  console.log(`\nUnmapped YAML keys (left as-is until Neon has series):`);
  for (const k of unmappedYaml) console.log(`  ${k}`);

  console.log(`\nWould also affect (not written in this script yet):`);
  console.log(`  - Convex divisions.externalKey / subscriberDivisionPreferences`);
  console.log(`  - apps/web/content/settings/divisions.yaml + teams.yaml`);
  console.log(`  - convex/lib/preferenceCatalog.ts`);
  console.log(`  - Pipeline articles already keyed by placeholder (remap or dual-read)`);

  if (dryRun) {
    console.log(
      `\nDry-run complete. No files or database rows were modified.`,
    );
    console.log(
      `To execute later: CONFIRM_TAXONOMY_MIGRATE=yes node scripts/neon-taxonomy-migrate.mjs --execute`,
    );
    console.log(
      `(Execute path is intentionally unimplemented until the remap strategy is approved.)`,
    );
    return;
  }

  if (process.env.CONFIRM_TAXONOMY_MIGRATE !== "yes") {
    console.error(
      "Refusing --execute without CONFIRM_TAXONOMY_MIGRATE=yes",
    );
    process.exit(1);
  }

  console.error(
    "Execute path not implemented yet — approve the mapping, then extend this script.",
  );
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
