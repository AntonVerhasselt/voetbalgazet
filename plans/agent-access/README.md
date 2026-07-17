# Agent access point

Plan for giving **Cursor Cloud Agents** (and similar automated browsers) a reliable way into the custom `/admin` without completing GitHub OAuth + 2FA on every run.

## Decisions

1. Agents get a **second access door** into Better Auth — not a bypass that skips auth.
2. That door issues a **normal Better Auth session cookie** for a dedicated agent identity.
3. The agent identity is linked to an app `users` row with **full admin role** by default (`AGENT_ACCESS_ROLE=admin`).
4. This unlocks **custom Convex admin** with full rights (overview, later nieuwsbrieven/abonnees/instellingen).
5. It does **not** unlock **hosted Keystatic GitHub mode** (that needs a real GitHub App OAuth + repo write).
6. Article editing by agents uses **Keystatic local mode + git** in the agent VM (see Keystatic boundary below).
7. Production stays GitHub-only for humans unless agent access is explicitly enabled with a strong secret.

## Documents

| Document | Inhoud |
|----------|--------|
| [01-architecture-and-flow.md](./01-architecture-and-flow.md) | Exact routes, session creation, env vars, security, Cursor setup |
| [02-keystatic-boundary.md](./02-keystatic-boundary.md) | What agents can/cannot test for articles; local vs GitHub mode |
| [03-launch-todos.md](./03-launch-todos.md) | Implementation checklist |

## Why not “just store GitHub login”?

GitHub OAuth in the browser still hits password + 2FA (and sometimes CAPTCHA). A GitHub PAT does **not** complete that browser flow. Cookie reuse expires with the Better Auth session (~7 days today).

The durable fix is an **agent credential owned by our app**, stored as a Cursor Runtime Secret, that mints an admin session without talking to GitHub.

## Related plans

- [`../docs/admin-auth.md`](../../docs/admin-auth.md) — human GitHub admin login (implemented)
- [`../content-admin/01-keystatic-architecture.md`](../content-admin/01-keystatic-architecture.md) — dual auth gate for articles
- [`../02-admin-dashboard.md`](../02-admin-dashboard.md) — custom admin vs Keystatic split
