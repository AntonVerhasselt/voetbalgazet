<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Monorepo with two dev services (commands live in the root `package.json` / `README.md`):

- **Convex backend** — start with `npm run dev:convex:agent` (anonymous local mode, no Convex account). Do NOT use plain `npm run dev:convex` in the cloud VM: it tries to log in. First run downloads the backend binary and interactively asks "Set up Convex AI files?" — answer **No** (it otherwise writes AGENTS/skill files). The local deployment always listens on `http://127.0.0.1:3210` (client) and `http://127.0.0.1:3211` (HTTP actions), and writes root `.env.local`.
- **Next.js web** — start with `npm run dev:web` (port 3000). `npm run dev` runs both together via `concurrently`.

Gotchas:
- The web app reads `NEXT_PUBLIC_CONVEX_URL` from `apps/web/.env.local` (gitignored, so it is NOT created by install). Create it with `NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210` before running the web app, or the homepage signup returns "nog niet geconfigureerd". The Convex-generated root `.env.local` uses `CONVEX_URL` (no `NEXT_PUBLIC_` prefix), so it does not satisfy the web app on its own.
- Hello-world / smoke test: the homepage (`/`) signup form calls the Convex `subscribers.startSignup` mutation. Verify persistence with `npx convex data subscribers`.
- Admin GitHub login (`/admin/inloggen`, `/admin/claim`) is out of scope locally: it needs `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (+ `ADMIN_BOOTSTRAP_ROLE_MAP`) set on the Convex deployment, and `apps/web/src/lib/auth-server.ts` requires the site URL to end in `.convex.site`, which the local `127.0.0.1:3211` host does not — so admin auth pages error against a local backend.
- Checks (`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`) all run without a live backend.
