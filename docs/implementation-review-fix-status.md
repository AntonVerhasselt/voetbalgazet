# Implementation review — fix status

Updated after fixing third-review Warnings on `cursor/fix-review-findings-f684` (17 Jul 2026).

- Detailed third review: [`docs/implementation-review-3.md`](./implementation-review-3.md)

## Critical — fixed

| ID | Fix |
|----|-----|
| C1 | Opaque `article_access` tokens (30d); `/email/artikel` exchanges via BA magic-link hop |
| C2 | Opaque `preferences_access` tokens; footer uses `/email/voorkeuren?token=` |
| C3 | `List-Unsubscribe` → `/api/email/uitschrijven?token=` |
| C4 | Agent prepare/event are internal; Convex.site HTTP bridge with Bearer secret + rate limit |

## Third-review Warnings — fixed

| ID | Fix |
|----|-----|
| W3-1 | Hard-bounce maps Resend `Permanent` / `Undetermined` (`convex/lib/bounce.ts`) |
| W3-2 | `recoverFailedRecipients` is `adminMutation`; UI Admin-only |
| W3-3 | Kill switch requires reason + `kill_switch_toggled` audit |
| W3-4 | `dispatchAdminSendAlert` emails Admins + initiator on failed / partially_failed |
| W3-5 | Single `newsletter_article_link_opened` owner in `public-analytics` |
| W3-6 | Taxonomy sync deactivates removed catalog keys (+ preview counts) |
| W3-7 | Prefs session fetch: 12s timeout + error → verify CTA |
| W3-8 | `previewAudience` counts in stream; keeps ≤20 sample rows |
| W3-9 | Retention also cleans unused revisions, old audits, stale uploading/rejected media |

## Still open / intentional non-code

| Item | Notes |
|------|-------|
| Pagefind full-text search | Archive search is MVP surface |
| Official VV taxonomy import | Human data source confirmation |
| Hosted Keystatic GitHub App smoke | Manual ops checklist |
| Vercel Preview Convex URL pair | Manual Vercel env |
| Full DSR export/erase tooling | Privacy copy: support process; no bulk export in MVP |
| Provider batching / workpool at 100k | Improved paging; full Resend batch API still incremental |
| Dual renderer perfect visual parity | Contract documented; shared `emails/` package not fully extracted |
| Launch todo checkbox hygiene | Some plan checkboxes lag shipped code |

## Manual ops

DMARC + DKIM for `nieuws.devoetbalgazet.be` verified. Keep `NEWSLETTER_LIVE_SEND=false` on agent deployments when not testing.
