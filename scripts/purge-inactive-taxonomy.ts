#!/usr/bin/env npx tsx
/**
 * Hard-purge inactive Convex taxonomy after Neon cleanup.
 *
 * Dry-run (default):
 *   npx tsx scripts/purge-inactive-taxonomy.ts
 *
 * Execute:
 *   CONFIRM_TAXONOMY_PURGE=1 npx tsx scripts/purge-inactive-taxonomy.ts --execute
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const execute = process.argv.includes("--execute");

function runConvex(args: string[]): string {
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

function parseConvexJson(stdout: string): unknown {
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

if (execute && process.env.CONFIRM_TAXONOMY_PURGE !== "1") {
  console.error("Refusing --execute without CONFIRM_TAXONOMY_PURGE=1");
  process.exit(1);
}

console.log(execute ? "=== EXECUTE PURGE ===" : "=== DRY-RUN PURGE ===");
const out = runConvex([
  "run",
  "taxonomy:purgeInactiveTaxonomyInternal",
  JSON.stringify({ execute }),
]);
console.log(out);
const parsed = parseConvexJson(out) as {
  execute: boolean;
  inactiveDivisions: Array<{ externalKey: string; label: string }>;
  inactiveTeams: Array<{ externalKey: string; label: string }>;
  subscribersScrubbed: number;
  preferenceRowsDeleted: number;
  divisionsDeleted: number;
  teamsDeleted: number;
};
console.log("\nInactive divisions:");
for (const d of parsed.inactiveDivisions) {
  console.log(`  ${d.externalKey} — ${d.label}`);
}
console.log("\nInactive teams:");
for (const t of parsed.inactiveTeams) {
  console.log(`  ${t.externalKey} — ${t.label}`);
}
console.log("\nResult summary:", {
  execute: parsed.execute,
  subscribersScrubbed: parsed.subscribersScrubbed,
  preferenceRowsDeleted: parsed.preferenceRowsDeleted,
  divisionsDeleted: parsed.divisionsDeleted,
  teamsDeleted: parsed.teamsDeleted,
  inactiveDivisionCount: parsed.inactiveDivisions.length,
  inactiveTeamCount: parsed.inactiveTeams.length,
});

if (!execute) {
  console.log(
    "\nNo writes. To execute: CONFIRM_TAXONOMY_PURGE=1 npx tsx scripts/purge-inactive-taxonomy.ts --execute",
  );
}
