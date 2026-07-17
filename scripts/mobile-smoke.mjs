#!/usr/bin/env node
/**
 * Mobile viewport smoke checks for Phase 4 newsletter admin UI.
 * Usage: node scripts/mobile-smoke.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.MOBILE_SMOKE_BASE ?? "http://localhost:3000";
const OUT = "/opt/cursor/artifacts/screenshots";
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const cookiePath = resolve(process.cwd(), ".agent-session.cookies");
const session = JSON.parse(readFileSync(cookiePath, "utf8"));

function parseCookieHeader(header) {
  return header.split("; ").filter(Boolean).map((part) => {
    const eq = part.indexOf("=");
    return {
      name: part.slice(0, eq),
      value: part.slice(eq + 1),
      domain: "localhost",
      path: "/",
    };
  });
}

const pages = [
  { path: "/admin", file: "mobile-fixed-01-nav.png", checks: ["nav"] },
  { path: "/admin/nieuwsbrieven", file: "mobile-fixed-02-campaigns.png", checks: ["campaigns"] },
  { path: "/admin/abonnees", file: "mobile-fixed-03-abonnees.png", checks: ["abonnees"] },
  { path: "/admin/email/dienstmails", file: "mobile-fixed-05-dienstmails.png", checks: ["dienstmails"] },
  { path: "/voorkeuren", file: "mobile-fixed-06-voorkeuren.png", checks: ["public"] },
  { path: "/uitschrijven", file: "mobile-fixed-07-uitschrijven.png", checks: ["public"] },
];

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
await page.setViewport(VIEWPORT);
await page.setCookie(...parseCookieHeader(session.cookieHeader));

const report = [];

async function measure(label) {
  return page.evaluate((lbl) => {
    const overflow =
      document.documentElement.scrollWidth > window.innerWidth + 1;
    const nav = document.querySelector(".admin-nav");
    const shortEl = document.querySelector(".admin-nav__short");
    const fullEl = document.querySelector(".admin-nav__full");
    const shortVisible = Boolean(
      shortEl && getComputedStyle(shortEl).display !== "none",
    );
    const fullHidden = Boolean(
      fullEl && getComputedStyle(fullEl).display === "none",
    );
    const navLabels = nav
      ? Array.from(nav.querySelectorAll(":scope > a, :scope > span")).map(
          (el) => {
            const short = el.querySelector(".admin-nav__short");
            const full = el.querySelector(".admin-nav__full");
            const shortShown =
              short && getComputedStyle(short).display !== "none";
            return (shortShown ? short?.textContent : full?.textContent)
              ?.replace(/\s+/g, " ")
              .trim();
          },
        )
      : [];
    const campaignThead = document.querySelector(
      ".newsletter-list__table thead",
    );
    const campaignTbody = document.querySelector(
      ".newsletter-list__table tbody",
    );
    const campaignCards = Boolean(
      campaignThead &&
        campaignTbody &&
        getComputedStyle(campaignThead).display === "none" &&
        getComputedStyle(campaignTbody).display === "grid",
    );
    const scrollWrap = document.querySelector(
      ".newsletter-subscribers .admin-table-scroll",
    );
    const table = document.querySelector(".newsletter-subscribers table");
    const scrollOverflow = scrollWrap
      ? scrollWrap.scrollWidth > scrollWrap.clientWidth
      : null;
    const tableWiderThanWrap = Boolean(
      table &&
        scrollWrap &&
        table.getBoundingClientRect().width >
          scrollWrap.getBoundingClientRect().width + 1,
    );
    const bottomNav = nav ? getComputedStyle(nav).position === "fixed" : null;
    return {
      label: lbl,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow,
      navLabels,
      shortVisible,
      fullHidden,
      campaignCards,
      scrollOverflow,
      tableWiderThanWrap,
      bottomNav,
    };
  }, label);
}

for (const entry of pages) {
  const url = `${BASE}${entry.path}`;
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector("body");
  // Give Convex/React a moment to hydrate list data
  await new Promise((r) => setTimeout(r, 1500));
  const metrics = await measure(entry.path);
  const shot = resolve(OUT, entry.file);
  await page.screenshot({ path: shot, fullPage: true });
  report.push({ ...entry, metrics, shot });
  console.log(JSON.stringify({ path: entry.path, metrics }, null, 2));
}

// Open first draft campaign controleren if available
await page.goto(`${BASE}/admin/nieuwsbrieven`, {
  waitUntil: "networkidle2",
  timeout: 60000,
});
await new Promise((r) => setTimeout(r, 1500));
const draftHref = await page.evaluate(() => {
  const link = document.querySelector(
    '.newsletter-list__table a[href*="/admin/nieuwsbrieven/"]',
  );
  return link?.getAttribute("href") ?? null;
});
if (draftHref) {
  await page.goto(`${BASE}${draftHref}/controleren`, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 1500));
  const metrics = await measure(`${draftHref}/controleren`);
  const shot = resolve(OUT, "mobile-fixed-04-controleren.png");
  await page.screenshot({ path: shot, fullPage: true });
  report.push({
    path: `${draftHref}/controleren`,
    file: "mobile-fixed-04-controleren.png",
    metrics,
    shot,
  });
  console.log(JSON.stringify({ path: `${draftHref}/controleren`, metrics }, null, 2));
}

await browser.close();

writeFileSync(
  resolve(OUT, "mobile-smoke-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

const failures = [];
for (const row of report) {
  const m = row.metrics;
  if (m.overflow) failures.push(`${row.path}: page horizontal overflow`);
  if (row.path.startsWith("/admin")) {
    if (m.bottomNav === false) failures.push(`${row.path}: bottom nav not fixed`);
  }
  if (row.path === "/admin") {
    if (!m.shortVisible || !m.fullHidden) {
      failures.push(`${row.path}: short nav labels not active`);
    }
    if (!m.navLabels?.includes("Brieven") || !m.navLabels?.includes("Mails")) {
      failures.push(
        `${row.path}: expected short labels Brieven/Mails, got ${JSON.stringify(m.navLabels)}`,
      );
    }
  }
  if (row.checks?.includes("campaigns") && m.campaignCards !== true) {
    failures.push(`${row.path}: campaign card layout not active`);
  }
  if (row.checks?.includes("abonnees")) {
    if (!m.scrollOverflow && !m.tableWiderThanWrap) {
      failures.push(`${row.path}: subscriber table not horizontally scrollable`);
    }
  }
}

if (failures.length) {
  console.error("MOBILE SMOKE FAILURES:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("MOBILE SMOKE OK");
