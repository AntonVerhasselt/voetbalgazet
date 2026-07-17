#!/usr/bin/env node
/**
 * Machine helper: POST /api/admin/agent-session and write cookies to a
 * gitignored file for subsequent curl/browser use.
 *
 * Usage:
 *   AGENT_ACCESS_SECRET=... npm run agent:login
 *   AGENT_ACCESS_SECRET=... npm run agent:login -- http://localhost:3000
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = (process.argv[2] || "http://localhost:3000").replace(/\/$/u, "");
const secret = process.env.AGENT_ACCESS_SECRET?.trim() ?? "";

if (secret.length < 32) {
  console.error(
    "AGENT_ACCESS_SECRET is unset or shorter than 32 characters. Refusing to login.",
  );
  process.exit(1);
}

const response = await fetch(`${target}/api/admin/agent-session`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({ secret }),
  redirect: "manual",
});

if (response.status === 404) {
  console.error(
    `Agent access is disabled on ${target} (404). Leave AGENT_ACCESS_SECRET unset only when the door should be closed.`,
  );
  process.exit(1);
}

if (!response.ok) {
  console.error(`Agent login failed with HTTP ${response.status}`);
  const body = await response.text();
  if (body) {
    console.error(body);
  }
  process.exit(1);
}

const cookies = response.headers.getSetCookie?.() ?? [];
const cookieHeader = cookies
  .map((entry) => entry.split(";")[0])
  .filter(Boolean)
  .join("; ");

const outPath = resolve(process.cwd(), ".agent-session.cookies");
writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      target,
      email: "cursor-agent@agents.devoetbalgazet.local",
      role: "admin",
      cookieHeader,
      setCookie: cookies,
      fetchedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
  { mode: 0o600 },
);

console.log(`Wrote agent session cookies to ${outPath}`);
