#!/usr/bin/env node
/**
 * Taxonomy sync helper (catalog → Convex divisions/teams).
 *
 * Dry-run (default):
 *   node scripts/sync-taxonomy.mjs
 *   node scripts/sync-taxonomy.mjs --dry-run
 *
 * Execute (requires confirmation env):
 *   CONFIRM_TAXONOMY_SYNC=1 node scripts/sync-taxonomy.mjs --execute
 *
 * Uses Convex CLI against the configured deployment. Prefer the admin UI
 * mutations `taxonomy.previewTaxonomySync` / `taxonomy.syncTaxonomyFromCatalog`
 * when logged in as Admin.
 */

import { spawnSync } from "node:child_process";

const execute = process.argv.includes("--execute");
const dryRun = !execute || process.argv.includes("--dry-run");

function runConvex(args) {
  const result = spawnSync("npx", ["convex", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

if (dryRun) {
  console.log("Taxonomy sync dry-run via preferenceCatalog keys…");
  const output = runConvex(["run", "taxonomy:previewTaxonomySyncInternal"]);
  console.log(output || "(no output)");
  console.log(
    "\nNo writes performed. To execute: CONFIRM_TAXONOMY_SYNC=1 node scripts/sync-taxonomy.mjs --execute",
  );
  process.exit(0);
}

if (process.env.CONFIRM_TAXONOMY_SYNC !== "1") {
  console.error(
    "Refusing to execute without CONFIRM_TAXONOMY_SYNC=1 after reviewing dry-run.",
  );
  process.exit(1);
}

console.log("Executing taxonomy sync…");
const output = runConvex(["run", "taxonomy:syncTaxonomyInternal"]);
console.log(output || "(done)");
