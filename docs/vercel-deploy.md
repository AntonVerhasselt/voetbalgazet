# Vercel + Convex deploy

Root Directory on Vercel: **`apps/web`**  
(“Include files outside the root directory” enabled.)

Config lives in `apps/web/vercel.json` (Build Command **Override** must stay
**off** in the Vercel UI, or the dashboard value wins).

| Setting | Value |
|---------|--------|
| Install Command | `cd ../.. && npm install` |
| Build Command | `cd ../.. && npx convex deploy --cmd 'npm run write-convex-env && npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL` |

`cd ..` alone lands in `apps/` and breaks the monorepo / Convex deploy.

## Production env vars (Vercel)

| Name | Value |
|------|--------|
| `CONVEX_DEPLOY_KEY` | Production deploy key from Convex |
| `NEXT_PUBLIC_CONVEX_URL` | `https://calculating-eel-615.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://calculating-eel-615.convex.site` |

Notes:

- Site URL = HTTP Actions host (`.convex.site`), not `.convex.cloud`.
- For this prod deployment use the **non-regional** site host (no `eu-west-1`).
- `convex deploy --cmd` also injects canonical cloud + site URLs for the build;
  `write-convex-env` bakes them into the Next.js auth proxy.

Preview / Development: only set Convex URLs if those environments should talk
to a specific deployment. Local `convex dev` URLs often include `eu-west-1`;
that is correct for **dev**, not for **prod**. See [Admin auth](./admin-auth.md).

## Domains (apex is canonical)

Primary production host: **`https://devoetbalgazet.be`** (no `www`).

In Vercel → Settings → Domains:

1. `devoetbalgazet.be` → Production, Valid
2. `www.devoetbalgazet.be` → redirect **308** to `devoetbalgazet.be` (apex primary)

Also keep the Next.js redirect in `apps/web/next.config.ts` (www → apex) so
OAuth and cookies stay on one host.

If www is Primary, Vercel can 308 apex → www and fight GitHub’s callback URL.

## Convex `SITE_URL`

On the **production** Convex deployment:

```text
SITE_URL=https://devoetbalgazet.be
```

On **development**:

```text
SITE_URL=http://localhost:3000
```

This is Better Auth’s `baseURL` / trusted origin base — keep it aligned with the
browser origin users actually use.
