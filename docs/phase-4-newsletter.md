# Phase 4 — Newsletter

Editorial newsletter admin for De Voetbalgazet: free-form React Email editor,
audience filters, test/live/scheduled sends via the Resend Convex component,
and delivery webhooks with suppressions.

Detailed product plan: [`plans/newsletter-admin-dashboard/`](../plans/newsletter-admin-dashboard/).

## What’s included

| Area | Routes / modules |
|------|------------------|
| Campaigns | `/admin/nieuwsbrieven` — list, create, duplicate, delete drafts |
| Editor | `/admin/nieuwsbrieven/[id]` — `@react-email/editor`, autosave, R2 images |
| Audience | `/admin/nieuwsbrieven/[id]/publiek` — division/team filters + preview |
| Send | `/admin/nieuwsbrieven/[id]/controleren` — test, send now, schedule |
| Results | `/admin/nieuwsbrieven/[id]/resultaten` |
| Subscribers | `/admin/abonnees` (masked emails) |
| Transactional | `/admin/email/dienstmails` (Admin edit/publish) |
| Settings | `/admin/email/instellingen` |
| Backend | `convex/newsletter*.ts`, `convex/r2.ts`, `convex/resendClient.ts` |
| Webhook | `{CONVEX_SITE_URL}/resend-webhook` |

## Environment

Already expected in the **Convex** deployment (not Next.js):

- `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`
- `R2_BUCKET`, `R2_ENDPOINT` (full `https://<account>.r2.cloudflarestorage.com`),
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_TOKEN`
- `BETTER_AUTH_SECRET` (also used to mint unsubscribe footer tokens)
- `SITE_URL`

Optional:

- `NEWSLETTER_LIVE_SEND=true` — disables Resend component `testMode` so
  non-`*@resend.dev` addresses can be queued. Keep unset in development.

## Local verification

```bash
npm test && npm run lint && npm run typecheck && npm run build
npm run agent:login -- http://localhost:3000
# Then open /admin/nieuwsbrieven
```

In development, use `delivered@resend.dev` for test sends and as a seeded
subscriber if you want a successful live queue while `testMode` is on.
