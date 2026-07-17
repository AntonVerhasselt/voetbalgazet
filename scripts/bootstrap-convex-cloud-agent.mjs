#!/usr/bin/env node
/**
 * Wire Convex for Cursor Cloud Agents without interactive `npx convex login`.
 *
 * Requires CONVEX_DEPLOY_KEY from Cursor Cloud Agent environment secrets
 * (dev key for spotted-spider-192). See docs/cloud-agent-auth.md.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootEnvPath = path.join(root, ".env.local");
const webEnvPath = path.join(root, "apps/web/.env.local");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * @param {string} filePath
 * @param {Record<string, string>} updates
 */
function upsertEnvFile(filePath, updates) {
  /** @type {string[]} */
  const lines = existsSync(filePath)
    ? readFileSync(filePath, "utf8").split("\n")
    : [];
  const seen = new Set();
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      return line;
    }
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    if (key in updates) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      if (next.length > 0 && next[next.length - 1] !== "") next.push("");
      next.push(`${key}=${value}`);
    }
  }
  writeFileSync(filePath, `${next.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").replace(/\n*$/u, "\n")}`);
}

const deployKey = process.env.CONVEX_DEPLOY_KEY?.trim();
if (!deployKey) {
  console.error(`
bootstrap-convex-cloud-agent: CONVEX_DEPLOY_KEY is not set.

Interactive \`npx convex login\` (GitHub OAuth) does NOT persist across Cloud
Agent pods. Add a dev deploy key as a Cursor secret instead:

  docs/cloud-agent-auth.md

Dashboard secrets:
  https://cursor.com/dashboard/cloud-agents/environments/r/github.com/antonverhasselt/voetbalgazet

Then start a new agent (or re-run this script once the secret is injected).
`);
  process.exit(1);
}

if (!deployKey.includes("|")) {
  console.error(
    "bootstrap-convex-cloud-agent: CONVEX_DEPLOY_KEY does not look like a Convex deploy key (expected 'dev:…|…').",
  );
  process.exit(1);
}

console.log("bootstrap-convex-cloud-agent: writing CONVEX_DEPLOY_KEY to .env.local");
upsertEnvFile(rootEnvPath, { CONVEX_DEPLOY_KEY: deployKey });

console.log("bootstrap-convex-cloud-agent: running npx convex dev --once");
const convex = spawnSync(
  "npx",
  ["convex", "dev", "--once", "--typecheck", "disable"],
  {
    cwd: root,
    env: { ...process.env, CONVEX_DEPLOY_KEY: deployKey },
    stdio: "inherit",
  },
);
if (convex.status !== 0) {
  console.error(
    `bootstrap-convex-cloud-agent: convex dev --once failed (exit ${convex.status ?? "unknown"}).`,
  );
  process.exit(convex.status ?? 1);
}

const rootEnv = parseEnvFile(rootEnvPath);
const convexUrl =
  rootEnv.CONVEX_URL?.trim() ||
  rootEnv.NEXT_PUBLIC_CONVEX_URL?.trim() ||
  process.env.CONVEX_URL?.trim() ||
  process.env.NEXT_PUBLIC_CONVEX_URL?.trim() ||
  "";
let convexSiteUrl =
  rootEnv.CONVEX_SITE_URL?.trim() ||
  rootEnv.NEXT_PUBLIC_CONVEX_SITE_URL?.trim() ||
  process.env.CONVEX_SITE_URL?.trim() ||
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim() ||
  "";

if (!convexSiteUrl && convexUrl.endsWith(".convex.cloud")) {
  // Prefer regional site host for cloud-dev deployments when present in CONVEX_URL.
  convexSiteUrl = convexUrl.replace(/\.convex\.cloud$/u, ".convex.site");
}

if (!convexUrl || !convexSiteUrl) {
  console.error(
    "bootstrap-convex-cloud-agent: convex finished but CONVEX_URL / SITE URL were not written to .env.local.",
  );
  process.exit(1);
}

upsertEnvFile(rootEnvPath, {
  CONVEX_DEPLOY_KEY: deployKey,
  NEXT_PUBLIC_CONVEX_URL: convexUrl,
  NEXT_PUBLIC_CONVEX_SITE_URL: convexSiteUrl,
});

upsertEnvFile(webEnvPath, {
  NEXT_PUBLIC_CONVEX_URL: convexUrl,
  NEXT_PUBLIC_CONVEX_SITE_URL: convexSiteUrl,
});

console.log(
  `bootstrap-convex-cloud-agent: ready → ${convexUrl} (site ${convexSiteUrl})`,
);
console.log(
  "No `npx convex login` needed on this pod. Start with: npm run dev",
);
