#!/usr/bin/env node
/**
 * Dry-run (default) / execute taxonomy alignment toward Neon series.id keys.
 *
 * Usage:
 *   node scripts/neon-taxonomy-migrate.mjs              # dry-run
 *   node scripts/neon-taxonomy-migrate.mjs --dry-run
 *   CONFIRM_TAXONOMY_MIGRATE=yes node scripts/neon-taxonomy-migrate.mjs --execute
 *
 * EXECUTE:
 *   1) Remaps Convex `divisions.externalKey` in place (preserves _id / prefs)
 *   2) Remaps pipeline string divisionKeys
 *   3) Runs taxonomy sync so teams + Neon-only series match the catalog
 *
 * Catalog / YAML / article frontmatter remaps live in the same release as this
 * script's mapping table — keep them in sync.
 */

import { spawnSync } from "node:child_process";
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
    catalogLabel: "1ste provinciale Antwerpen",
  },
  "antwerpen-p2a": {
    neonSeriesId: "CHP_136335",
    neonSeriesName: "2 Provinciaal Antw A",
    catalogLabel: "2de provinciale A Antwerpen",
  },
};

const NEON_ONLY_SERIES = [
  {
    neonSeriesId: "CHP_134688",
    neonSeriesName: "BvA Heren Groep 1 P1/P2",
  },
];

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
  const file = path.join(root, "apps/web/content/settings/divisions.yaml");
  const text = fs.readFileSync(file, "utf8");
  const keys = [...text.matchAll(/key:\s*([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
  return { file, keys };
}

function runConvex(args) {
  const result = spawnSync("npx", ["convex", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    cwd: root,
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

function parseConvexJson(stdout) {
  // Convex CLI prints the JSON result; may be preceded by log lines.
  const start = stdout.indexOf("{");
  const startArr = stdout.indexOf("[");
  const idx =
    start === -1
      ? startArr
      : startArr === -1
        ? start
        : Math.min(start, startArr);
  if (idx === -1) {
    throw new Error(`Could not parse Convex output:\n${stdout}`);
  }
  return JSON.parse(stdout.slice(idx));
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
  const validationErrors = [];

  for (const [placeholder, neon] of Object.entries(PLACEHOLDER_TO_NEON)) {
    const inYamlAsPlaceholder = yaml.keys.includes(placeholder);
    const inYamlAsNeon = yaml.keys.includes(neon.neonSeriesId);
    const inNeon = neonSeries.some((s) => s.id === neon.neonSeriesId);
    if (!inNeon) {
      validationErrors.push(
        `Neon missing series ${neon.neonSeriesId} for ${placeholder}`,
      );
    }
    planned.push({
      action: "remap_external_key",
      from: placeholder,
      to: neon.neonSeriesId,
      label: neon.catalogLabel,
      inYamlAsPlaceholder,
      inYamlAsNeon,
      inNeon,
    });
  }

  for (const s of NEON_ONLY_SERIES) {
    const inYaml = yaml.keys.includes(s.neonSeriesId);
    const inNeon = neonSeries.some((row) => row.id === s.neonSeriesId);
    if (!inNeon) {
      validationErrors.push(`Neon missing series ${s.neonSeriesId}`);
    }
    planned.push({
      action: "add_neon_series",
      from: null,
      to: s.neonSeriesId,
      label: s.neonSeriesName,
      inYaml,
      inNeon,
    });
  }

  const mappedPlaceholders = new Set(Object.keys(PLACEHOLDER_TO_NEON));
  const mappedNeonIds = new Set([
    ...Object.values(PLACEHOLDER_TO_NEON).map((m) => m.neonSeriesId),
    ...NEON_ONLY_SERIES.map((s) => s.neonSeriesId),
  ]);
  const unmappedYaml = yaml.keys.filter(
    (k) => !mappedPlaceholders.has(k) && !mappedNeonIds.has(k),
  );

  console.log(`\nPlanned changes (${planned.length}):`);
  for (const p of planned) {
    console.log(
      `  ${p.action}: ${p.from ?? "(new)"} → ${p.to} (${p.label}) [yamlPlaceholder=${p.inYamlAsPlaceholder ?? false} yamlNeon=${p.inYamlAsNeon ?? p.inYaml ?? false} neon=${p.inNeon}]`,
    );
  }
  console.log(`\nUnmapped YAML keys (left as-is until Neon has series):`);
  for (const k of unmappedYaml) console.log(`  ${k}`);

  if (validationErrors.length > 0) {
    console.error("\nValidation errors:");
    for (const err of validationErrors) console.error(`  - ${err}`);
    process.exit(1);
  }

  const remaps = Object.entries(PLACEHOLDER_TO_NEON).map(
    ([from, neon]) => ({
      from,
      to: neon.neonSeriesId,
      label: neon.catalogLabel,
    }),
  );

  if (dryRun) {
    console.log(`\nWould call Convex:`);
    console.log(
      `  taxonomy:remapDivisionKeysToNeonInternal ${JSON.stringify({ remaps })}`,
    );
    console.log(`  taxonomy:syncTaxonomyInternal`);
    console.log(
      `\nDry-run complete. No files or database rows were modified.`,
    );
    console.log(
      `To execute: CONFIRM_TAXONOMY_MIGRATE=yes node scripts/neon-taxonomy-migrate.mjs --execute`,
    );
    return;
  }

  if (process.env.CONFIRM_TAXONOMY_MIGRATE !== "yes") {
    console.error(
      "Refusing --execute without CONFIRM_TAXONOMY_MIGRATE=yes",
    );
    process.exit(1);
  }

  console.log("\n1) Remapping Convex division keys in place…");
  const remapOut = runConvex([
    "run",
    "taxonomy:remapDivisionKeysToNeonInternal",
    JSON.stringify({ remaps }),
  ]);
  console.log(remapOut || "(no output)");
  const remapResult = parseConvexJson(remapOut);
  console.log("Remap result:", remapResult);

  console.log("\n2) Syncing taxonomy from preferenceCatalog…");
  const syncOut = runConvex(["run", "taxonomy:syncTaxonomyInternal"]);
  console.log(syncOut || "(no output)");
  const syncResult = parseConvexJson(syncOut);
  console.log("Sync result:", syncResult);

  console.log("\nExecute complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
