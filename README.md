# De Voetbalgazet

Flemish local-football publication: public site (Phase 2) plus Keystatic
article admin MVP (Phase 3).

## Open manual todos (human)

Do these outside this repo before considering Phase 3 ops complete:

1. **Follow the operator checklist** — step-by-step GitHub App smoke, roles,
   newsletter-only unsubscribe check, legal ops:  
   [`docs/phase-3-manual-checklist.md`](./docs/phase-3-manual-checklist.md)
2. **Fix Vercel Preview Convex URL env vars** — in Vercel → Settings →
   Environment Variables, Preview currently needs a correct pair (not a lone
   `.cloud` URL). Set **both** for the Preview environment to the deployment
   preview builds should use (usually production `calculating-eel-615`):

   ```text
   NEXT_PUBLIC_CONVEX_URL=https://calculating-eel-615.convex.cloud
   NEXT_PUBLIC_CONVEX_SITE_URL=https://calculating-eel-615.convex.site
   ```

   Use the **non-regional** `.convex.site` host (no `eu-west-1`). Missing or
   mismatched Preview `SITE_URL` breaks `/api/auth/*` on preview deployments.
   Production should keep the same pair (or rely on `convex deploy --cmd`
   injection **plus** these vars for consistency). Details:
   [`docs/vercel-deploy.md`](./docs/vercel-deploy.md),
   [`docs/admin-auth.md`](./docs/admin-auth.md).

Tracked again in [`docs/phase-3-follow-ups.md`](./docs/phase-3-follow-ups.md).

## Included

- Next.js public site with static Markdoc articles, email gate, and preferences
- Convex subscribers, consent evidence, taxonomies, and admin users
- Better Auth admin login (GitHub) through a same-origin Next.js route
- Keystatic artikeladmin (`/keystatic`) with Git-backed Markdoc + YAML settings
- Signed draft preview (`/preview/*`) with gate/ungated mobile checks
- Branded mobile-first `/admin` shell linking to Artikels
- strict TypeScript, Convex ESLint rules, focused unit tests with coverage
  gates (`vitest.config.ts`), and GitHub Actions CI (`.github/workflows/ci.yml`)
- shared `@devoetbalgazet/emails` package for the TipTap → HTML renderer used by
  Convex sends and the browser editor contract
- Next.js 16 `src/proxy.ts` early gates for `/admin`, `/keystatic`, and `/preview`

Newsletter admin (campaigns, editor, Resend sends): see
[`docs/phase-4-newsletter.md`](./docs/phase-4-newsletter.md).

Operational docs: [`docs/`](./docs/) (admin auth, Keystatic, Convex cloud agents,
Vercel).

## Development

```bash
npm install
npm run bootstrap:convex   # Cloud Agents: requires CONVEX_DEPLOY_KEY secret
npm run dev
```

`npm run dev` starts Convex and the Next.js app together. To run them separately:

```bash
npm run dev:convex
npm run dev:web
```

Use `npx convex dev` for development. Do not use `npx convex deploy` except in
an intentional production release workflow (or the Vercel build below).

### Cursor Cloud Agents

Do **not** rely on `npx convex login` (GitHub OAuth) inside Cloud Agents — that
session lives only on that VM and disappears on the next pod. Set a Cursor
secret `CONVEX_DEPLOY_KEY` and run:

```bash
npm ci
npm run bootstrap:convex
```

Details: [`docs/cloud-agent-auth.md`](./docs/cloud-agent-auth.md).

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

Also set Keystatic GitHub App secrets when hosting the editor — see
[`docs/keystatic-admin.md`](./docs/keystatic-admin.md).

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
```

Only a GitHub account with a verified email present in
`ADMIN_BOOTSTRAP_ROLE_MAP` can claim an application admin profile. Creating an
auth session alone never grants access. Existing disabled profiles cannot
self-reactivate.

## Checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Design source

Live tokens and composition rules live in `plans/ui-ux/`. The implementation
follows that written design direction.
