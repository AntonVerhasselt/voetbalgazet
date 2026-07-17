# Agent access — architecture and flow

## Goal

A Cursor Cloud Agent can open `http://localhost:3000/admin` (or a preview URL) and act as **admin** **without** GitHub OAuth, while humans keep GitHub login unchanged.

## Non-goals

- Replacing human GitHub login.
- Giving agents Keystatic **GitHub mode** write access (see [02-keystatic-boundary.md](./02-keystatic-boundary.md)).
- A production public “login as agent” feature for journalists.
- Auth bypass flags that invent a fake session without Better Auth.
- Multiple agent-related env vars — **one secret only**.

## High-level design

```text
Human path (unchanged)
  /admin/inloggen → GitHub OAuth → /admin/claim → Better Auth cookie → /admin

Agent path (new)
  One Cursor Runtime Secret: AGENT_ACCESS_SECRET
       │
       ▼
  POST /api/admin/agent-session  (or form on /admin/agent-inloggen)
       │  secret unset / too short → 404 (door closed)
       │  wrong secret → 401
       │  ok → ensure agent user (role admin) + Better Auth session
       ▼
  /admin  (protected layout → api.admin.getSession works unchanged)
```

The protected layout at `apps/web/src/app/admin/(protected)/layout.tsx` keeps calling `fetchAuthQuery(api.admin.getSession)`. **No special-case bypass** in that layout. If the cookie is valid and the `users` row exists, the agent is in.

## One secret

| Name | Where | Purpose |
|------|-------|---------|
| `AGENT_ACCESS_SECRET` | Cursor **Runtime Secret** + gitignored `.env.agent-access.local` | The only agent credential. Length ≥ 32. |

Everything else is **hardcoded in code/plan**, not env:

| Concern | Value |
|---------|--------|
| Kill switch | Secret **unset** or shorter than 32 chars → agent routes return `404` |
| Role | Always `admin` |
| Agent email | Always `cursor-agent@agents.devoetbalgazet.local` |
| Better Auth password (if email/password used internally) | **Derived** server-side from `AGENT_ACCESS_SECRET` (e.g. HMAC-SHA256); never a second env var |

Production: leave `AGENT_ACCESS_SECRET` unset on Vercel. That alone closes the door.

**Never commit the real secret.** Do not put it in plan markdown, `AGENTS.md`, or `.env.example` (placeholder only).

### Where to store it

| Location | What |
|----------|------|
| Cursor Dashboard → Cloud Agents → Secrets | `AGENT_ACCESS_SECRET` as **Runtime Secret** |
| `.env.agent-access.local` (gitignored) | Same value for the agent VM / local Next process |
| Production Vercel | Unset |

## Identity model

| Field | Value |
|-------|--------|
| Better Auth email | `cursor-agent@agents.devoetbalgazet.local` (not a real mailbox) |
| Email verified | `true` (set at provision time) |
| App `users.role` | **`admin`** (fixed) |
| GitHub account | **none** |
| Bootstrap map | **must not** include this email in `ADMIN_BOOTSTRAP_ROLE_MAP` |

Why a fixed email: one stable principal, easy to disable (`users.disabledAt`), easy to audit, never confusable with a human GitHub claim.

## Routes and API

### 1. Interactive page — `GET /admin/agent-inloggen`

Minimal, noindex page (Dutch copy, same admin login visual language):

- Heading: “Agenttoegang”
- Short explanation: alleen voor geautomatiseerde redactietests; niet voor journalisten.
- Single password field + submit (the access secret; never echo it).
- On success → redirect `/admin` (`/admin/claim` is **not** used — membership is ensured server-side).
- On failure → generic error (“Ongeldige agenttoegang.”).
- Link back to `/admin/inloggen` for humans.
- `robots: noindex` via route `metadata`.
- **Not linked** from the public site or from `/admin/inloggen`.
- If secret env unset → `404` (page does not exist).

Cursor computer-use flow:

1. Agent reads `AGENT_ACCESS_SECRET` from the environment.
2. Opens `/admin/agent-inloggen`.
3. Fills the secret and submits.
4. Lands on `/admin` as admin.

### 2. Machine endpoint — `POST /api/admin/agent-session`

Same-origin Next.js route handler.

**Request**

```http
POST /api/admin/agent-session
Content-Type: application/json

{ "secret": "<AGENT_ACCESS_SECRET>" }
```

Optional: `Authorization: Bearer <AGENT_ACCESS_SECRET>` (if both body and header are present, they must match).

**Success (200)**

- Sets Better Auth session cookies (same attributes as GitHub login).
- JSON: `{ "ok": true, "email": "cursor-agent@agents.devoetbalgazet.local", "role": "admin" }`.

**Failure**

| Condition | Status |
|-----------|--------|
| Secret unset / too short | `404` |
| Wrong secret | `401` `{ "ok": false }` |
| Rate limited | `429` |
| Provisioning/session error | `500` (log details server-side) |

**Why Next.js:** session cookies must be first-party on the site origin, same as `/api/auth/*`.

### 3. Optional helper script

`npm run agent:login`: read `AGENT_ACCESS_SECRET`, `POST` the endpoint, write cookies to a gitignored file. Refuse (exit non-zero) if the target returns 404.

## Session creation (Better Auth)

### Preferred mechanism

1. Enable Better Auth **email/password** **only for the agent path** (not on `/admin/inloggen`).
2. On first successful agent login:
   - Create Better Auth user with fixed email + password **derived** from `AGENT_ACCESS_SECRET` (HMAC; not stored as a separate env).
   - Mark email verified.
3. Verify submitted secret against `AGENT_ACCESS_SECRET` (constant-time), then `signInEmail` with fixed email + derived password → normal session cookie.
4. Ensure app membership: if no `users` row for that `authUserId`, insert `{ role: "admin" }`.

When `AGENT_ACCESS_SECRET` is rotated, re-derive the password and update the Better Auth user password on next successful login (or recreate the agent user). Document that rotation may require one re-provision step.

Do **not** use `claimConfiguredMembership` / `ADMIN_BOOTSTRAP_ROLE_MAP` for the agent.

### Explicitly forbidden

- Faking `getSession` without a Better Auth session.
- Accepting the secret via query string.
- Reusing `BETTER_AUTH_SECRET` or GitHub client secrets as the agent secret.
- Extra env vars for enable/role/password/email.

## Rate limiting and auditing

### Rate limit

- Max **10** failed attempts per IP per 15 minutes.
- Max **30** successful logins per IP per hour.

### Audit

`agentAccessEvents` table:

```text
at: number
result: "success" | "failure" | "disabled"
ipHash?: string
userAgent?: string
```

Never store the submitted secret.

## Schema / backend touch points

### `users` table

Existing shape is enough: `{ authUserId, email, role, disabledAt? }` with `role: "admin"`.

### New table (recommended)

```ts
agentAccessEvents: defineTable({
  at: v.number(),
  result: v.union(
    v.literal("success"),
    v.literal("failure"),
    v.literal("disabled"),
  ),
  ipHash: v.optional(v.string()),
  userAgent: v.optional(v.string()),
}).index("by_at", ["at"])
```

### Auth config (`convex/auth.ts`)

- Keep GitHub for humans.
- Email/password only as internal agent mechanism; no button on `/admin/inloggen`.

### Admin auth helpers

No change. Agent is a normal `users` row with `admin`.

## Cursor Cloud setup

1. Add **one** Runtime Secret: `AGENT_ACCESS_SECRET` (value in `.env.agent-access.local` / chat — not in git).
2. Ensure the Next.js process can read it when `npm run dev:web` starts.
3. Open `/admin/agent-inloggen`, paste the secret, land on `/admin` as admin.

`apps/web/AGENTS.md` should say exactly that — one secret, role is admin.

## Security checklist

- [ ] Unset secret → `404` on agent routes.
- [ ] Secret never via query string; constant-time compare.
- [ ] No public/human-login links to agent page; `noindex`.
- [ ] Production leaves secret unset.
- [ ] Agent email not in bootstrap map.
- [ ] Disable by removing/rotating the secret or setting `users.disabledAt`.
- [ ] Unit tests for unset/wrong/correct secret (no live GitHub).

## Test plan

1. **Disabled:** unset `AGENT_ACCESS_SECRET` → 404.
2. **Wrong secret:** 401; no cookie.
3. **Correct secret:** cookie set; `/admin` works; `getSession` → agent email + `admin`.
4. **Human path untouched:** `/admin/inloggen` still GitHub-only.
5. **Disabled membership:** `disabledAt` on agent user → kicked out on next `getSession`.

## Implementation sketch (file map)

```text
apps/web/src/app/admin/agent-inloggen/page.tsx
apps/web/src/app/admin/agent-inloggen/agent-login-form.tsx
apps/web/src/app/api/admin/agent-session/route.ts
apps/web/src/lib/agent-access.ts          # one secret: present? compare; derive password
convex/agentAccess.ts
convex/schema.ts                         # agentAccessEvents
docs/admin-auth.md
apps/web/AGENTS.md
.env.example                             # AGENT_ACCESS_SECRET=  (comment only)
scripts/agent-login.mjs                  # optional
```

Extend `apps/web/src/lib/auth-server.ts` rather than inventing a second cookie stack.
