# Implementation review — fix status

Updated after the fix pass + second review / E2E on `cursor/fix-review-findings-f684` (17 Jul 2026).

Original findings: see the review PR / earlier `docs/implementation-review.md` on the review branch.

## Critical — fixed

| ID | Fix |
|----|-----|
| C1 | Opaque `article_access` tokens (30d); `/email/artikel` exchanges via BA magic-link hop |
| C2 | Opaque `preferences_access` tokens; footer uses `/email/voorkeuren?token=` |
| C3 | `List-Unsubscribe` → `/api/email/uitschrijven?token=` |
| C4 | Agent prepare/event are internal; Convex.site HTTP bridge with Bearer secret + rate limit |

## Warnings — fixed (code)

Token opacity (W12), kill switch, cancel→cancelled, audience indexes, prepare paging, `usedBySentEmail`, test/preheader matching, soft/hard bounce, homepage/archive UX, SEO/robots, gate entitlement, share + analytics gaps, `excludeFromSearch`, `KEYSTATIC_STORAGE` / branch prefix env, agent Convex rate limits, taxonomy sync (preview + execute), retention crons, failed-recipient recovery UI, admin PostHog events (partial), emails renderer contract README, plan status hygiene.

## Second-review / E2E follow-ups (17 Jul)

| Item | Status |
|------|--------|
| Kill-switch mid-send threw after patch (Convex rollback) | Fixed — `enqueueRecipientBatch` returns `null` after marking failed |
| Tunnel/proxy redirects used `localhost` origin | Fixed — `getPublicRequestOrigin()` for email bootstrap + unsubscribe redirects |
| Internal `testOps` mint/delete helpers for controlled E2E | Added (`convex/testOps.ts`) |
| Public site smoke (home, archive filters, article, prefs gate) | Pass (computer use) |
| Prefs bootstrap → magic-link → `/voorkeuren` | Pass (tunnel GET chain + Convex prefs update) |
| Unsubscribe confirm + POST | Pass (`status=bevestigd`, `newsletterSubscribed=false`, siteAccess kept) |
| Resubscribe via `resubscribeToNewsletter` | Pass |
| Admin pages with agent session | Pass (curl + agent cookies; browser secret redacted in CU env) |
| Live send to `anton.verhasselt@gmail.com` | **Fails at provider** — Resend `last_event: bounced` (domain verified; `delivered@resend.dev` OK). Not an app-queue bug. |

## Still open / intentional non-code

| Item | Notes |
|------|-------|
| Gmail delivery for owner inbox | Check Resend bounce subtype/DMARC/suppression in dashboard; sink + pipeline OK |
| Prefs page when logged-out | Stays on “sessie controleren…” without timeout (UX polish) |
| Pagefind full-text search | Archive search is MVP surface; Pagefind still optional |
| Open Design source copy into `design/open-design/` | Requires local export from designer machine |
| Official VV taxonomy import | Human data source confirmation |
| Hosted Keystatic GitHub App smoke | Manual ops checklist |
| Vercel Preview Convex URL pair | Manual Vercel env |
| Full DSR export/erase tooling | Privacy copy: support process; no bulk export in MVP |
| Pixel-perfect Open Design parity | Blocked on missing design assets |
| Provider batching / workpool at 100k | Improved paging; full Resend batch API still incremental |
| Dual renderer perfect visual parity | Contract documented; shared `emails/` package not fully extracted |

## Manual ops before live sends

Still follow `plans/newsletter-admin-dashboard/09-launch-todos.md` (DMARC, inbox tests, first accounts, etc.).

`NEWSLETTER_LIVE_SEND` was set back to `false` on the agent Convex deployment after E2E.
