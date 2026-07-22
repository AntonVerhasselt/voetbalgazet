#!/usr/bin/env node
/**
 * Neon ↔ public taxonomy helpers.
 *
 * Public/UI keys are ALWAYS readable kebab-case (antwerpen-p1).
 * Neon series.id (CHP_*) is mapping-only for SQL / research agents.
 *
 * Usage:
 *   node scripts/neon-taxonomy-migrate.mjs              # dry-run
 *   node scripts/neon-taxonomy-migrate.mjs --dry-run
 *   CONFIRM_TAXONOMY_MIGRATE=yes node scripts/neon-taxonomy-migrate.mjs --execute
 *
 * EXECUTE (recovery / ensure readable externalKeys):
 *   Remaps accidental Neon ids on Convex divisions/pipeline back to public keys,
 *   then syncs taxonomy from preferenceCatalog.
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

/** Neon series.id → readable public key (must stay in sync with neonSeriesMap). */
const NEON_TO_PUBLIC = {
  CHP_130005: {
    publicKey: "antwerpen-p1",
    neonSeriesName: "1 Provinciaal Antw",
    catalogLabel: "1ste provinciale Antwerpen",
  },
  CHP_136335: {
    publicKey: "antwerpen-p2a",
    neonSeriesName: "2 Provinciaal Antw A",
    catalogLabel: "2de provinciale A Antwerpen",
  },
  CHP_134688: {
    publicKey: "antwerpen-bva-g1",
    neonSeriesName: "BvA Heren Groep 1 P1/P2",
    catalogLabel: "BvA Heren Groep 1 P1/P2",
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
  console.log(
    "Policy: user-facing keys stay readable; Neon CHP_* ids are SQL-only.",
  );

  const neonSeries = await loadNeonSeries(url);
  const yaml = loadYamlDivisions();

  console.log(`\nNeon series (${neonSeries.length}):`);
  for (const s of neonSeries) {
    console.log(`  ${s.id}  ${s.name}`);
  }

  console.log(`\nYAML division keys (${yaml.keys.length}) in ${yaml.file}`);
  const chpInYaml = yaml.keys.filter((k) => k.startsWith("CHP_"));
  if (chpInYaml.length > 0) {
    console.error(
      `\nERROR: YAML still contains Neon ids as keys (not allowed):\n  ${chpInYaml.join("\n  ")}`,
    );
    process.exit(1);
  }

  const planned = [];
  const validationErrors = [];

  for (const [neonId, meta] of Object.entries(NEON_TO_PUBLIC)) {
    const inNeon = neonSeries.some((s) => s.id === neonId);
    const inYaml = yaml.keys.includes(meta.publicKey);
    if (!inNeon) {
      validationErrors.push(`Neon missing series ${neonId}`);
    }
    if (!inYaml) {
      validationErrors.push(
        `YAML missing readable public key ${meta.publicKey} for ${neonId}`,
      );
    }
    planned.push({
      action: "ensure_public_external_key",
      from: neonId,
      to: meta.publicKey,
      label: meta.catalogLabel,
      inYaml,
      inNeon,
    });
  }

  const mappedNeon = new Set(Object.keys(NEON_TO_PUBLIC));
  const unmappedNeon = neonSeries.filter((s) => !mappedNeon.has(s.id));

  console.log(`\nPlanned Convex remaps if CHP_* externalKeys exist (${planned.length}):`);
  for (const p of planned) {
    console.log(
      `  ${p.action}: ${p.from} → ${p.to} (${p.label}) [yaml=${p.inYaml} neon=${p.inNeon}]`,
    );
  }

  console.log(
    `\nNeon series without a publicKey mapping yet (${unmappedNeon.length}):`,
  );
  for (const s of unmappedNeon) {
    console.log(`  ${s.id}  ${s.name}`);
  }
  console.log(
    "(TODO: Anton supplies remaining series ids → extend neonSeriesMap only.)",
  );

  if (validationErrors.length > 0) {
    console.error("\nValidation errors:");
    for (const err of validationErrors) console.error(`  - ${err}`);
    process.exit(1);
  }

  const remaps = Object.entries(NEON_TO_PUBLIC).map(([from, meta]) => ({
    from,
    to: meta.publicKey,
    label: meta.catalogLabel,
  }));

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

  console.log("\n1) Remapping any CHP_* Convex keys back to readable public keys…");
  const remapOut = runConvex([
    "run",
    "taxonomy:remapDivisionKeysToNeonInternal",
    JSON.stringify({ remaps }),
  ]);
  console.log(remapOut || "(no output)");
  console.log("Remap result:", parseConvexJson(remapOut));

  console.log("\n2) Syncing taxonomy from preferenceCatalog…");
  const syncOut = runConvex(["run", "taxonomy:syncTaxonomyInternal"]);
  console.log(syncOut || "(no output)");
  console.log("Sync result:", parseConvexJson(syncOut));

  console.log("\nExecute complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
