# Admin auth (GitHub login)

Admins sign in at `/admin/inloggen` with GitHub. The browser always calls the
**same-origin** Next.js route `/api/auth/*`. That route proxies to Convex HTTP
Actions (Better Auth).

```text
Browser
  → POST https://devoetbalgazet.be/api/auth/sign-in/social
  → Next.js apps/web/src/app/api/auth/[...all]
  → Convex https://<deployment>.convex.site/api/auth/...
  → GitHub OAuth
  → callback https://devoetbalgazet.be/api/auth/callback/github
```

## Two Convex URLs (do not mix them up)

| Env var | Ends with | Used for |
|---------|-----------|----------|
| `NEXT_PUBLIC_CONVEX_URL` | `.convex.cloud` | Convex client (queries / mutations) |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `.convex.site` | HTTP Actions + auth proxy |

The auth proxy must use the **site** URL. Pointing it at `.convex.cloud` (or a
wrong host) yields an empty **404** from Convex.

## Local vs production hosts

Each Convex deployment has its own canonical URLs. They are **not** the same shape.

| Environment | Deployment (example) | Site URL shape |
|-------------|----------------------|----------------|
| Local / `convex dev` | `spotted-spider-192` | **With** region: `https://spotted-spider-192.eu-west-1.convex.site` |
| Production | `calculating-eel-615` | **Without** region: `https://calculating-eel-615.convex.site` |

Use whatever `npx convex dev` writes into `.env.local` for development.
Do **not** copy the local `eu-west-1` site host onto production — for this
prod deployment that host 404s and breaks GitHub login.

Production values:

```text
NEXT_PUBLIC_CONVEX_URL=https://calculating-eel-615.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://calculating-eel-615.convex.site
```

## GitHub OAuth app (production)

- Homepage: `https://devoetbalgazet.be`
- Authorization callback: `https://devoetbalgazet.be/api/auth/callback/github`

Canonical site host is the **apex** (no `www`). See [Vercel + Convex deploy](./vercel-deploy.md).

## Convex deployment env (auth secrets)

Set on the Convex deployment (Dashboard → Settings → Environment Variables),
not only on Vercel:

```text
SITE_URL=https://devoetbalgazet.be          # local: http://localhost:3000
BETTER_AUTH_SECRET=<secret>
GITHUB_CLIENT_ID=<oauth app client id>
GITHUB_CLIENT_SECRET=<oauth app secret>
ADMIN_BOOTSTRAP_ROLE_MAP={"you@example.com":"admin"}
```

A GitHub session alone does not grant admin access. The verified email must be
listed in `ADMIN_BOOTSTRAP_ROLE_MAP` (claim flow at `/admin/claim`).

## How the Next.js proxy gets its URLs

1. Prefer URLs baked at build time by `npm run write-convex-env` (during
   `convex deploy --cmd` on Vercel) into
   `apps/web/src/lib/convex-public-env.generated.ts`.
2. Else use `NEXT_PUBLIC_CONVEX_*` from the environment.
3. Else derive `.site` from `.cloud` by swapping the TLD only (keeps region labels).

There is **no** silent fallback to a placeholder host. Misconfiguration fails
clearly instead of proxying to a dead URL.

## Quick checks

Working production proxy:

```bash
curl -sS -D - -o /tmp/auth.json -X POST \
  'https://devoetbalgazet.be/api/auth/sign-in/social' \
  -H 'content-type: application/json' \
  -H 'origin: https://devoetbalgazet.be' \
  --data-raw '{"provider":"github","callbackURL":"/admin/claim"}'
```

Expect **200** and a JSON body with a `url` pointing at `github.com/login/oauth`.

If the proxy host is wrong, the API may return **502** with `proxyTarget` set to
the Convex site URL it tried. That value must match the working `.convex.site`
host for the deployment.

Direct Convex check (bypasses Next.js):

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  'https://calculating-eel-615.convex.site/api/auth/sign-in/social' \
  -H 'content-type: application/json' \
  -H 'origin: https://devoetbalgazet.be' \
  --data-raw '{"provider":"github","callbackURL":"/admin/claim"}'
```

Expect **200**. If this works but the same-origin `/api/auth/...` call does not,
the Next.js proxy target is wrong (Vercel env / build bake).
