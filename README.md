# De Voetbalgazet

Phase 2 public site for a mobile-first Flemish local-football publication.

## Included

- static homepage, archive, free/gated articles, sitemap, robots and excerpt RSS
- mandatory mobile-first reader gate with shared homepage signup and preferences
- 90-day Better Auth anonymous reader sessions and verified magic-link sessions
- Convex subscriber consent, taxonomy preferences and indexed division projection
- privacy-safe PostHog EU browser events plus privacy and terms pages
- Better Auth reader/admin login through a same-origin Next.js route
- server-side admin role enforcement for `admin`, `journalist`, and `viewer`
- paywall-aware NewsArticle JSON-LD, canonical and social metadata
- strict TypeScript, Convex ESLint rules, and focused content/auth tests

Keystatic/GitHub authoring belongs to Phase 3. Campaign production, delivery
webhooks and newsletter reporting belong to Phase 4.

Operational docs (admin GitHub login, Vercel + Convex URLs): see [`docs/`](./docs/).

## Development

```bash
npm install
npm run dev
```

`npm run dev` starts Convex and the Next.js app together. To run them separately:

```bash
npm run dev:convex
npm run dev:web
```

For an isolated Cloud Agent backend with public reader auth:

```bash
npm run dev:convex:agent
```

Set `NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210` and
`NEXT_PUBLIC_CONVEX_SITE_URL=http://127.0.0.1:3211` in
`apps/web/.env.local`.

Use `npx convex dev` for development. Do not use `npx convex deploy` except in
an intentional production release workflow (or the Vercel build below).

The Convex development command creates `.env.local` with the public Convex
URLs. Copy those public values to `apps/web/.env.local` when the web workspace
does not pick up the root environment automatically.

## Vercel production build

Root Directory must be `apps/web` (with “Include files outside the root
directory” enabled). From that directory the monorepo root is **two** levels up:

| Setting | Value |
|---------|--------|
| Install Command | `cd ../.. && npm install` |
| Build Command | `cd ../.. && npx convex deploy --cmd 'npm run write-convex-env && npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL` |

`cd ..` alone lands in `apps/` (no root `package.json`) and breaks Convex deploy.

Required Vercel env (Production):

| Name | Value |
|------|--------|
| `CONVEX_DEPLOY_KEY` | Production deploy key from Convex |
| `NEXT_PUBLIC_CONVEX_URL` | `https://calculating-eel-615.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://calculating-eel-615.convex.site` |

`NEXT_PUBLIC_CONVEX_SITE_URL` is the Convex **HTTP Actions** URL (`.convex.site`),
not the cloud URL. For this production deployment it must be the **non-regional**
host `https://calculating-eel-615.convex.site`. The regional variant
`https://calculating-eel-615.eu-west-1.convex.site` returns empty 404s and breaks
GitHub login via `/api/auth/*`.

The Vercel build runs `write-convex-env` so `convex deploy --cmd` can bake the
canonical cloud + site URLs into the Next.js auth proxy. Still set both env vars
in the Vercel project so previews/local tooling stay consistent.

Canonical production host is the **apex** (no www):

- Convex `SITE_URL=https://devoetbalgazet.be`
- GitHub OAuth homepage: `https://devoetbalgazet.be`
- GitHub OAuth callback: `https://devoetbalgazet.be/api/auth/callback/github`

In Vercel → Settings → Domains, set `devoetbalgazet.be` as **Primary** and
redirect `www` → apex. If www stays primary, Vercel 308s apex → www and breaks
OAuth that expects the non-www callback.

## Admin authentication

Set these values on the Convex development deployment:

```text
SITE_URL=http://localhost:3000
BETTER_AUTH_SECRET=<random secret>
GITHUB_CLIENT_ID=<GitHub OAuth app client id>
GITHUB_CLIENT_SECRET=<GitHub OAuth app secret>
ADMIN_BOOTSTRAP_ROLE_MAP={"editor@example.be":"admin"}
RESEND_API_KEY=<resend api key>
EMAIL_FROM=De Voetbalgazet <redactie@devoetbalgazet.be>
```

Only a GitHub account with a verified email present in
`ADMIN_BOOTSTRAP_ROLE_MAP` can claim an application admin profile. Creating an
auth session alone never grants access. Existing disabled profiles cannot
self-reactivate. Admin allowlist addresses cannot use the public magic-link
flow.

Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` in the web
environment to enable cookieless browser analytics. Without both values,
analytics remains disabled.

## Checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Design source

The canonical Open Design export still needs to be copied into
`design/open-design/`. Until then, the implementation follows the written
design direction but does not claim pixel parity.
