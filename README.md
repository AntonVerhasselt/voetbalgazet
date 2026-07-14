# De Voetbalgazet

Flemish local football news platform. See [plans/](./plans/) for full product documentation.

## Quick start

```bash
# Install dependencies
npm install

# Start Convex backend (terminal 1)
npm run convex:dev

# Start admin dashboard (terminal 2)
npm run dev
```

Open http://localhost:3000 — redirects to the newsletter admin at `/admin/newsletter`.

## Newsletter admin dashboard

The first implemented component. Features:

- Visual email composition with [@react-email/editor](https://react.email/docs/editor/getting-started)
- Draft / sent email management with duplicate support
- Audience targeting by division (reeks) and favorite team preferences
- Test sends and batch delivery via [Convex Resend component](https://www.convex.dev/components/resend)

See [plans/04-newsletter-admin-dashboard.md](./plans/04-newsletter-admin-dashboard.md) for full documentation.

## Environment

Copy `apps/web/.env.local.example` to `apps/web/.env.local` and set `NEXT_PUBLIC_CONVEX_URL` from the Convex dev output.

For production email sending, configure in Convex dashboard:

- `RESEND_API_KEY`
- `RESEND_FROM_ADDRESS`
- `RESEND_WEBHOOK_SECRET`

Set `testMode: false` in `convex/lib/resendClient.ts` when ready for production.
