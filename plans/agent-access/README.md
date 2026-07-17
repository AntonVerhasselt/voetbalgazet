# Agent access point

Plan for giving **Cursor Cloud Agents** a reliable way into `/admin` without GitHub OAuth + 2FA.

## Decisions

1. Agents get a **second access door** into Better Auth — not a bypass that skips auth.
2. That door issues a **normal Better Auth session cookie** for a dedicated agent identity with role **`admin`**.
3. **One credential only:** `AGENT_ACCESS_SECRET` (Cursor Runtime Secret). No enable flag, no role env, no second password env.
4. Door is closed when the secret is unset (typical for production).
5. Unlocks **custom Convex admin** with full admin rights.
6. Does **not** unlock **hosted Keystatic GitHub mode** — agents use **Keystatic local mode + git** (see [02-keystatic-boundary.md](./02-keystatic-boundary.md)).

## Documents

| Document | Inhoud |
|----------|--------|
| [01-architecture-and-flow.md](./01-architecture-and-flow.md) | Routes, one-secret model, session creation, security |
| [02-keystatic-boundary.md](./02-keystatic-boundary.md) | Articles: local vs GitHub mode for agents |
| [03-launch-todos.md](./03-launch-todos.md) | Implementation checklist |

## Why not “just store GitHub login”?

GitHub OAuth in the browser still hits password + 2FA (and sometimes CAPTCHA). A GitHub PAT does **not** complete that browser flow.

## Related plans

- [`../../docs/admin-auth.md`](../../docs/admin-auth.md) — human GitHub admin login (implemented)
- [`../content-admin/01-keystatic-architecture.md`](../content-admin/01-keystatic-architecture.md) — dual auth gate for articles
- [`../02-admin-dashboard.md`](../02-admin-dashboard.md) — custom admin vs Keystatic split
