<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Monorepo with two dev services (commands live in the root `package.json` / `README.md`).

**Do not use `npx convex login` (GitHub OAuth) as the Cloud Agent auth path.**
That writes `~/.convex/config.json` on the current VM only; the next agent pod
will not have it. Permanent setup: Cursor secret `CONVEX_DEPLOY_KEY` +
`npm run bootstrap:convex` — see [`docs/cloud-agent-auth.md`](../../docs/cloud-agent-auth.md).

- **Convex backend** — two modes:
  - **Real cloud-agent deployment (preferred for admin/auth):** require Cursor secret `CONVEX_DEPLOY_KEY` (dev key for `spotted-spider-192`). Run `npm ci && npm run bootstrap:convex`. No interactive login. Writes root + `apps/web/.env.local`.
  - **Anonymous local** (`npm run dev:convex:agent`): no Convex account, good enough for the public site. First run downloads the backend binary and interactively asks "Set up Convex AI files?" — answer **No**. Listens on `http://127.0.0.1:3210` / `:3211`. Admin auth will not work.
- **Next.js web** — start with `npm run dev:web` (port 3000). `npm run dev` runs both together via `concurrently`.

Gotchas:
- The web app reads `NEXT_PUBLIC_CONVEX_URL` / `NEXT_PUBLIC_CONVEX_SITE_URL` from `apps/web/.env.local` (gitignored). `bootstrap:convex` syncs these; anonymous mode needs `NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210` by hand.
- Hello-world / smoke test (public): homepage signup → `subscribers.startSignup`. Verify with `npx convex data subscribers`.
- **Admin GitHub login** (`/admin/inloggen` → `/admin/claim` → `/admin`) only works against the **real** `*.convex.site` deployment (deploy-key path), not anonymous. The `voetbalgazet` / `spotted-spider-192` deployment already has auth env vars. OAuth callback: `http://localhost:3000/api/auth/callback/github` (use the Desktop pane). Only allowlisted GitHub verified emails get admin.
- Checks (`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`) run without a live backend.
