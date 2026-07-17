# Implementation review — fix status

Updated after the fix pass on `cursor/fix-review-findings-f684` (17 Jul 2026).

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

## Still open / intentional non-code

| Item | Notes |
|------|-------|
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
