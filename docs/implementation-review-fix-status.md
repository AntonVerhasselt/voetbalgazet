# Implementation review — fix status

Updated after the **third review** (17 Jul 2026) on `cursor/fix-review-findings-f684`, post-merge of `origin/master` (`3e1ba91`).

- Original findings: review PR / earlier `docs/implementation-review.md` on the review branch  
- Fix pass + second review / E2E: sections below  
- **Third review (detailed):** [`docs/implementation-review-3.md`](./implementation-review-3.md)

## Critical — fixed

| ID | Fix |
|----|-----|
| C1 | Opaque `article_access` tokens (30d); `/email/artikel` exchanges via BA magic-link hop |
| C2 | Opaque `preferences_access` tokens; footer uses `/email/voorkeuren?token=` |
| C3 | `List-Unsubscribe` → `/api/email/uitschrijven?token=` |
| C4 | Agent prepare/event are internal; Convex.site HTTP bridge with Bearer secret + rate limit |

Third review: **no new Criticals**; master merge did not regress opaque tokens.

## Warnings — fixed (code)

Token opacity (W12), kill switch runtime, cancel→cancelled, audience indexes, prepare paging, `usedBySentEmail`, test/preheader matching, homepage/archive UX, SEO/robots, gate entitlement, share + analytics gaps (partial), `excludeFromSearch`, `KEYSTATIC_STORAGE` / branch prefix env, agent Convex rate limits, taxonomy sync upsert (preview + execute), retention crons (partial), failed-recipient recovery UI, admin PostHog events (partial), emails renderer contract README, plan status hygiene, kill-switch mid-send rollback, `getPublicRequestOrigin()` for tunnels.

## Second-review / E2E (17 Jul)

| Item | Status |
|------|--------|
| Kill-switch mid-send threw after patch (Convex rollback) | Fixed — returns `null` after marking failed |
| Tunnel/proxy redirects used `localhost` origin | Fixed — `getPublicRequestOrigin()` |
| Internal `testOps` mint/delete helpers | Added |
| Public + prefs + unsub + resub + admin agent session | Pass |
| Live send to owner Gmail (pre-DNS) | Bounced at provider (DMARC) — **not** app queue |

## Third-review updates (17 Jul)

| Item | Status |
|------|--------|
| Merge `master` (PostHog cookieless, TrackedArticleLink, ArticleShare, Keystatic tracing) | Done — no opaque-token conflict |
| Gmail / Trooper delivery after DNS | **Pass** — delivered + opened (DMARC relaxed + DKIM fixed) |
| Hard-bounce → suppression (`includes("hard")` vs Resend `Permanent`) | **Open Warning** (W3-1) |
| Recovery Admin-only | **Open Warning** — still `editorMutation` (W3-2) |
| Kill-switch reason + audit | **Open Warning** (W3-3) |
| `admin_send_alert` dispatch | **Open Warning** (W3-4) |
| Double `newsletter_article_link_opened` | **Open Warning** (W3-5) |
| Taxonomy deactivate removed keys | **Open Warning** (W3-6) |
| Prefs “sessie controleren” hang | **Open Warning** (W3-7) |

## Still open / intentional non-code

| Item | Notes |
|------|-------|
| Prefs page when logged-out | Stays on “sessie controleren…” without timeout (W3-7) |
| Pagefind full-text search | Archive search is MVP surface |
| Open Design source copy into `design/open-design/` | Requires local export from designer machine |
| Official VV taxonomy import | Human data source confirmation |
| Hosted Keystatic GitHub App smoke | Manual ops checklist |
| Vercel Preview Convex URL pair | Manual Vercel env |
| Full DSR export/erase tooling | Privacy copy: support process; no bulk export in MVP |
| Pixel-perfect Open Design parity | Blocked on missing design assets |
| Provider batching / workpool at 100k | Improved paging; full Resend batch API still incremental |
| Dual renderer perfect visual parity | Contract documented; shared `emails/` package not fully extracted |
| Launch todo checkbox hygiene | DMARC / List-Unsubscribe code+ops ahead of unchecked boxes in `09-launch-todos.md` |

## Manual ops before live sends

Follow `plans/newsletter-admin-dashboard/09-launch-todos.md`. **DMARC + DKIM for `nieuws.devoetbalgazet.be` are verified in production DNS** as of third review; keep monitoring `rua` reports.

`NEWSLETTER_LIVE_SEND` should stay `false` on the agent Convex deployment when not actively testing.
