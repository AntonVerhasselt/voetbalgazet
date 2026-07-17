<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Monorepo with two dev services (commands live in the root `package.json` / `README.md`):

- **Convex backend** — two modes:
  - **Anonymous local** (`npm run dev:convex:agent`): no Convex account, good enough for the public site. First run downloads the backend binary and interactively asks "Set up Convex AI files?" — answer **No** (it otherwise writes AGENTS/skill files). Listens on `http://127.0.0.1:3210` (client) and `http://127.0.0.1:3211` (HTTP actions), and writes root `.env.local`.
  - **Real dev deployment** (`npx convex dev`): needs a Convex account (`npx convex login`, browser/device flow — the VM Desktop pane works). Choose "choose an existing project" → `voetbalgazet`; it provisions the `spotted-spider-192` dev deployment with real `.convex.cloud` / `.convex.site` URLs. Required for admin auth (see below). If root `.env.local` still points at `anonymous:anonymous-agent`, delete it first so `convex dev` prompts for project selection.
- **Next.js web** — start with `npm run dev:web` (port 3000). `npm run dev` runs both together via `concurrently`.

Note: this VM is typically already authenticated to Convex (the `voetbalgazet` project login persists in the snapshot), so both `npm run dev:convex` and `npm run dev:convex:agent` connect to the **real `spotted-spider-192` dev deployment** — writing regional `.eu-west-1.convex.cloud` / `.eu-west-1.convex.site` URLs to root `.env.local` — rather than the `127.0.0.1` anonymous backend. When that happens, set `apps/web/.env.local` to those regional URLs (copy `CONVEX_URL` → `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_SITE_URL` → `NEXT_PUBLIC_CONVEX_SITE_URL` from root `.env.local`); the homepage signup then works end-to-end. Only fall back to the `127.0.0.1:3210` anonymous URLs if the account is NOT logged in and Convex actually starts the local anonymous backend.

Gotchas:
- The web app reads `NEXT_PUBLIC_CONVEX_URL` (and `NEXT_PUBLIC_CONVEX_SITE_URL`) from `apps/web/.env.local` (gitignored, so it is NOT created by install). The Convex-generated root `.env.local` uses `CONVEX_URL` (no `NEXT_PUBLIC_` prefix), so it does not satisfy the web app on its own. Set it to match whichever backend mode you run:
  - Anonymous: `NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210` (homepage signup only; admin auth will not work).
  - Real dev deployment: copy the `.convex.cloud` and `.convex.site` URLs from root `.env.local`.
- Hello-world / smoke test (public): the homepage (`/`) signup form calls the Convex `subscribers.startSignup` mutation. Verify persistence with `npx convex data subscribers`.
- **Admin GitHub login** (`/admin/inloggen` → `/admin/claim` → `/admin`) works only against the **real dev deployment**, not the anonymous backend: `apps/web/src/lib/auth-server.ts` rejects any HTTP-actions host that is not `*.convex.site`, and `127.0.0.1:3211` fails that check. The `voetbalgazet` dev deployment already carries `GITHUB_CLIENT_ID/SECRET`, `BETTER_AUTH_SECRET`, `SITE_URL=http://localhost:3000`, and `ADMIN_BOOTSTRAP_ROLE_MAP` (e.g. `anton.verhasselt@gmail.com → admin`), so no extra config is needed once connected. The GitHub OAuth app callback is `http://localhost:3000/api/auth/callback/github`; because the browser runs inside the VM (use the Desktop pane), that localhost callback resolves. Only the allowlisted GitHub verified email is granted an admin profile.
- **Agent access (no GitHub 2FA):** set Runtime Secret `AGENT_ACCESS_SECRET` (≥ 32 chars) in Cursor, put the same value in `apps/web/.env.local` (and `npx convex env set AGENT_ACCESS_SECRET …` on the real dev deployment). Open `/admin/agent-inloggen`, paste the secret, land on `/admin` as `cursor-agent@agents.devoetbalgazet.local` with role `admin`. Machine path: `npm run agent:login` or `POST /api/admin/agent-session`. Unset secret → routes return 404. Do **not** put this secret on production Vercel.
- Checks (`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`) all run without a live backend.
