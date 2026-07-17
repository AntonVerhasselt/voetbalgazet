# Agent access — launch todos

## Prerequisites

- [ ] Real Convex dev deployment available to agents (not anonymous-only) for admin sessions
- [x] Generate `AGENT_ACCESS_SECRET` (≥ 32 random bytes) — store in Cursor Secrets + `.env.agent-access.local` (not in git)
- [x] Generate separate `AGENT_USER_PASSWORD` (≥ 32 random bytes) — same storage
- [x] Default role is **`admin`** (full access)

## Implementation

- [ ] Add env placeholders + comments to `.env.example`
- [ ] Add `apps/web/src/lib/agent-access.ts` (enabled check, constant-time compare, role/email defaults)
- [ ] Add `POST /api/admin/agent-session` route handler
- [ ] Add `/admin/agent-inloggen` page + form (noindex, not linked from human login)
- [ ] Wire Better Auth email/password **server-side only** for the fixed agent user (or chosen alternative)
- [ ] Ensure/create Better Auth user + `users` membership on successful login (do not use bootstrap map)
- [ ] Add `agentAccessEvents` table + write on success/failure
- [ ] Rate limit failed attempts
- [ ] Optional `npm run agent:login` cookie helper (gitignored output)
- [ ] Unit tests: disabled → 404; wrong secret; role default parsing
- [ ] Update `docs/admin-auth.md` with agent section
- [ ] Update `apps/web/AGENTS.md` Cursor instructions
- [ ] Cross-link from `plans/02-admin-dashboard.md` and `plans/content-admin/01-keystatic-architecture.md`

## Cursor environment

- [ ] Add `AGENT_ACCESS_ENABLED=true` to Cloud Agent secrets
- [ ] Add `AGENT_ACCESS_SECRET` as Runtime Secret (value already generated; see chat / `.env.agent-access.local`)
- [ ] Add `AGENT_USER_PASSWORD` as Runtime Secret
- [ ] Add `AGENT_ACCESS_ROLE=admin`
- [ ] Confirm Next.js process receives the vars when `npm run dev:web` starts
- [ ] Smoke: agent opens `/admin/agent-inloggen` → `/admin` → session shows admin

## Keystatic follow-up (when Keystatic is implemented)

- [ ] `KEYSTATIC_STORAGE` switches local vs github per [02-keystatic-boundary.md](./02-keystatic-boundary.md)
- [ ] Document that agent session alone does not complete hosted GitHub saves
- [ ] Optional bot-GitHub E2E runbook (separate)

## Production

- [ ] Leave `AGENT_ACCESS_ENABLED` unset on production Vercel by default
- [ ] If ever enabled in production: rotate secret, confirm audit events, restrict to need-to-know
