# Documentation

Short operational notes for De Voetbalgazet.

## Open manual todos

1. [`phase-3-manual-checklist.md`](./phase-3-manual-checklist.md) — GitHub App,
   hosted Keystatic smoke, roles, newsletter-only unsubscribe, legal ops
2. **Vercel Preview Convex URLs** — set both Preview env vars to the intended
   deployment (non-regional `.convex.site`):

   ```text
   NEXT_PUBLIC_CONVEX_URL=https://calculating-eel-615.convex.cloud
   NEXT_PUBLIC_CONVEX_SITE_URL=https://calculating-eel-615.convex.site
   ```

   See [vercel-deploy.md](./vercel-deploy.md) and [admin-auth.md](./admin-auth.md).

| Doc | Topic |
|-----|--------|
| [Admin auth (GitHub login)](./admin-auth.md) | How admin login works, Convex `.cloud` vs `.site`, local vs production URLs |
| [Cloud agent auth](./cloud-agent-auth.md) | Why `npx convex login` does not persist; permanent `CONVEX_DEPLOY_KEY` setup |
| [Keystatic admin](./keystatic-admin.md) | Local vs GitHub Keystatic, preview sessions, Vercel secrets |
| [Phase 3 follow-ups](./phase-3-follow-ups.md) | Post-merge todos: hosted Keystatic, taxonomy, reader launch gaps |
| [Phase 3 manual checklist](./phase-3-manual-checklist.md) | Step-by-step ops: GitHub App, smoke publish, roles, newsletter-only unsubscribe |
| [Vercel + Convex deploy](./vercel-deploy.md) | Production build, env vars, domains (apex vs www) |

For product/architecture plans, see `/plans`.
