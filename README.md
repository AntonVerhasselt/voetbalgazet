# De Voetbalgazet

Phase 1 foundation for a mobile-first Flemish local-football publication.

## Included

- Next.js 16 public site with a static homepage and sample article
- provisional Open Design-inspired tokens and responsive editorial UI
- Convex schema for subscribers, consent evidence, taxonomies, and admin users
- privacy-safe, idempotent signup-start mutation
- Better Auth admin login through a same-origin Next.js route
- server-side admin role enforcement for `admin`, `journalist`, and `viewer`
- strict TypeScript, Convex ESLint rules, and focused unit tests

Reader sessions, the article gate, real division/team data, Keystatic, email
delivery, and newsletter tooling belong to later phases.

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
| Build Command | `cd ../.. && npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL` |

`cd ..` alone lands in `apps/` (no root `package.json`) and breaks Convex deploy.

Required Vercel env (Production): `CONVEX_DEPLOY_KEY`,
`NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`.

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

The canonical Open Design export still needs to be copied into
`design/open-design/`. Until then, the implementation follows the written
design direction but does not claim pixel parity.
