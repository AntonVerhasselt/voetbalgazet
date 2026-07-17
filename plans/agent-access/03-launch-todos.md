# Agent access — launch todos

## Prerequisites

- [ ] Real Convex dev deployment available to agents (not anonymous-only) for admin sessions
- [x] Generate single `AGENT_ACCESS_SECRET` (≥ 32 chars) — Cursor Runtime Secret + `.env.agent-access.local` (not in git)
- [x] Role fixed to **`admin`** (no role env var)

## Implementation

- [ ] Add `AGENT_ACCESS_SECRET=` placeholder + comment to `.env.example` only
- [ ] Add `apps/web/src/lib/agent-access.ts` (unset→disabled, constant-time compare, derive internal password from secret)
- [ ] Add `POST /api/admin/agent-session` route handler
- [ ] Add `/admin/agent-inloggen` page + form (noindex, not linked from human login)
- [ ] Wire Better Auth session for fixed agent user (email hardcoded; password derived from secret)
- [ ] Ensure/create `users` row with `role: "admin"` (do not use bootstrap map)
- [ ] Add `agentAccessEvents` table + write on success/failure
- [ ] Rate limit failed attempts
- [ ] Optional `npm run agent:login` cookie helper
- [ ] Unit tests: unset → 404; wrong secret; correct secret
- [ ] Update `docs/admin-auth.md` with agent section (one secret)
- [ ] Update `apps/web/AGENTS.md` Cursor instructions
- [ ] Cross-links already in `plans/02-admin-dashboard.md` and Keystatic architecture

## Cursor environment

- [ ] Add **only** `AGENT_ACCESS_SECRET` as Runtime Secret (see `.env.agent-access.local` / prior chat)
- [ ] Confirm Next.js can read it when `npm run dev:web` starts
- [ ] Smoke: `/admin/agent-inloggen` → `/admin` as admin

## Keystatic follow-up (when Keystatic is implemented)

- [ ] `KEYSTATIC_STORAGE` local vs github per [02-keystatic-boundary.md](./02-keystatic-boundary.md)
- [ ] Document that agent session alone does not complete hosted GitHub saves

## Production

- [ ] Leave `AGENT_ACCESS_SECRET` unset on production Vercel
- [ ] If ever enabled there: rotate secret, confirm audit events
