# Agent access — architecture and flow

## Goal

A Cursor Cloud Agent can open `http://localhost:3000/admin` (or a preview URL) and act as a redactielid **without** GitHub OAuth, while humans keep GitHub login unchanged.

## Non-goals

- Replacing human GitHub login.
- Giving agents Keystatic **GitHub mode** write access (see [02-keystatic-boundary.md](./02-keystatic-boundary.md)).
- A production public “login as agent” feature for journalists.
- Auth bypass flags that invent a fake session without Better Auth.

## High-level design

```text
Human path (unchanged)
  /admin/inloggen → GitHub OAuth → /admin/claim → Better Auth cookie → /admin

Agent path (new)
  Cursor Secrets: AGENT_ACCESS_SECRET
       │
       ▼
  POST /api/admin/agent-session  (or form on /admin/agent-inloggen)
       │  constant-time secret check
       │  ensure agent Better Auth user + users row
       ▼
  Better Auth Set-Cookie (same session mechanism as humans)
       │
       ▼
  /admin  (protected layout → api.admin.getSession works unchanged)
```

The protected layout at `apps/web/src/app/admin/(protected)/layout.tsx` keeps calling `fetchAuthQuery(api.admin.getSession)`. **No special-case bypass** in that layout. If the cookie is valid and the `users` row exists, the agent is in.

## Identity model

### Dedicated agent principal

| Field | Value |
|-------|--------|
| Better Auth email | `cursor-agent@agents.devoetbalgazet.local` (not a real mailbox) |
| Email verified | `true` (set at provision time) |
| App `users.email` | same string, lowercased |
| App `users.role` | from env `AGENT_ACCESS_ROLE` (default `journalist`) |
| GitHub account | **none** |
| Bootstrap map | **must not** include this email in `ADMIN_BOOTSTRAP_ROLE_MAP` |

Why a fixed email: one stable principal, easy to disable (`users.disabledAt`), easy to audit, never confusable with a human GitHub claim.

### Role default

- Default: `journalist` — enough to exercise editor UIs once nieuwsbrieven/artikels landings exist.
- Override via `AGENT_ACCESS_ROLE=admin|journalist|viewer` only in Cursor/dev secrets.
- Never hardcode `admin` in source as the default.

## Enabling gate (kill switch)

Agent login is available only when **all** of these are true:

1. `AGENT_ACCESS_ENABLED=true` (explicit string; missing/false → 404 on agent routes).
2. `AGENT_ACCESS_SECRET` is set and length ≥ 32 characters.
3. Request is allowed by environment policy (see Production policy).

If any check fails, respond as if the route does not exist (`404`), not `401` with a helpful message (avoid advertising the door).

### Production policy

| Environment | Policy |
|-------------|--------|
| Local / Cursor Cloud Agent | Allowed when enabled + secret set |
| Vercel Preview | Optional; only if preview secrets are set intentionally |
| Vercel Production (`devoetbalgazet.be`) | **Default off.** Enable only with a deliberate ops decision and a rotated secret. Prefer leaving production GitHub-only for humans. |

Document in `docs/admin-auth.md` and `apps/web/AGENTS.md`: production should normally omit `AGENT_ACCESS_ENABLED`.

## Routes and API

### 1. Interactive page — `GET /admin/agent-inloggen`

Minimal, noindex page (Dutch copy, same admin login visual language):

- Heading: “Agenttoegang”
- Short explanation: alleen voor geautomatiseerde redactietests; niet voor journalisten.
- Single password field + submit (secret is treated like a password; never echo it).
- On success → redirect `/admin` (or `/admin/claim` is **not** used — membership is ensured server-side).
- On failure → generic error (“Ongeldige agenttoegang.”), no distinction between wrong secret / disabled / misconfig.
- Link back to `/admin/inloggen` for humans.
- `robots: noindex` via route `metadata`.
- **Not linked** from the public site or from `/admin/inloggen`.

Cursor computer-use flow:

1. Agent reads `AGENT_ACCESS_SECRET` from the environment (Runtime Secret).
2. Opens `/admin/agent-inloggen`.
3. Fills the secret and submits.
4. Lands on `/admin` with a normal session cookie.

### 2. Machine endpoint — `POST /api/admin/agent-session`

Same-origin Next.js route handler (not a Convex public mutation callable from the browser without the secret).

**Request**

```http
POST /api/admin/agent-session
Content-Type: application/json

{ "secret": "<AGENT_ACCESS_SECRET>" }
```

Optional header alternative (also accepted, same secret):

```http
Authorization: Bearer <AGENT_ACCESS_SECRET>
```

Body and header must not both disagree; if both present they must match.

**Success (200)**

- Sets Better Auth session cookies via the same cookie attributes Better Auth already uses for GitHub login (HttpOnly, Secure in prod, `SameSite=Lax`, path `/`).
- JSON body: `{ "ok": true, "email": "cursor-agent@agents.devoetbalgazet.local", "role": "journalist" }`.

**Failure**

| Condition | Status |
|-----------|--------|
| Feature disabled / secret unset | `404` |
| Wrong secret | `401` with generic body `{ "ok": false }` |
| Rate limited | `429` |
| Provisioning/session error | `500` with generic body (log details server-side) |

**Why Next.js, not Convex HTTP alone:** session cookies must be first-party on the site origin (`localhost:3000` / `devoetbalgazet.be`), same reason as the existing `/api/auth/*` proxy. The handler may call into Better Auth / Convex internally, but the `Set-Cookie` response is emitted from Next.js.

### 3. Optional helper script

Add `npm run agent:login` in the monorepo root (or `apps/web`) that:

1. Reads `AGENT_ACCESS_SECRET` and `SITE_URL` (default `http://localhost:3000`).
2. `POST`s `/api/admin/agent-session`.
3. Writes cookies to a gitignored file (e.g. `.agent/auth-cookies.json`) for Playwright/`agent-browser` restore.

Document usage in `apps/web/AGENTS.md`. Script must refuse to run if `AGENT_ACCESS_ENABLED` is not true on the target (detect via 404).

## Session creation (Better Auth)

### Preferred mechanism

1. Enable Better Auth **email/password** **only for the agent path** (not exposed on `/admin/inloggen`).
2. On first successful agent login (or via a one-shot seed):
   - Create Better Auth user with fixed email + a random high-entropy password stored only as Convex/Next env `AGENT_USER_PASSWORD` (or derived: never equal to `AGENT_ACCESS_SECRET`).
   - Mark email verified.
3. Agent login handler verifies `AGENT_ACCESS_SECRET`, then calls Better Auth `signInEmail` (server-side) with the fixed email + `AGENT_USER_PASSWORD`, which issues the normal session cookie.
4. Ensure app membership: if no `users` row for that `authUserId`, insert one with `AGENT_ACCESS_ROLE`.

Do **not** reuse `claimConfiguredMembership` / `ADMIN_BOOTSTRAP_ROLE_MAP` for the agent. That map is for human GitHub emails only.

### Alternative (acceptable if email/password is undesirable)

Use Better Auth **API Key** plugin with `enableSessionForAPIKeys`, plus a thin `/admin/agent-inloggen` that exchanges `AGENT_ACCESS_SECRET` for a one-time redirect that sets a session cookie. Prefer email/password sign-in for the MVP because it reuses the existing cookie session path with fewer moving parts for browser computer-use.

### Explicitly forbidden

- Setting `users` without a Better Auth session and faking `getSession` in the layout.
- Accepting the agent secret as a query-string parameter (leaks via logs/Referer).
- Sharing one secret that also equals `BETTER_AUTH_SECRET` or GitHub client secrets.

## Rate limiting and auditing

### Rate limit

In the Next.js route (in-memory per isolate is OK for MVP; document limitation on serverless):

- Max **10** failed attempts per IP per 15 minutes.
- Max **30** successful logins per IP per hour (agents retry; keep headroom).

On limit: `429`, no body detail.

### Audit

Insert an `agentAccessEvents` Convex table (or append-only log via internal mutation):

```text
at: number
result: "success" | "failure" | "disabled"
ipHash?: string   // optional keyed hash of IP; never store raw IP long-term if avoidable
userAgent?: string
```

Do not store the submitted secret. Failures and successes both log.

Human admins can later read this from Instellingen; MVP may be Convex dashboard only.

## Schema / backend touch points

### `users` table

No schema change required for MVP if the agent row uses the existing shape:

```ts
{ authUserId, email, role, disabledAt? }
```

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

- Keep GitHub social provider for humans.
- Add email/password only if chosen mechanism requires it; do not add an email/password button on `/admin/inloggen`.
- Session TTL stays shared (currently 7 days) unless we later shorten agent sessions via Better Auth session overrides.

### Admin auth helpers (`convex/lib/adminAuth.ts`)

No change to role checks. Agent is a normal `users` row.

Optional later: `users.isAgent: v.optional(v.boolean())` to hide agent from human member lists and to tag audit UI. Not required for MVP login.

## Environment variables

| Name | Where | Purpose |
|------|-------|---------|
| `AGENT_ACCESS_ENABLED` | Next.js (and documented for Cursor Secrets) | Kill switch (`true` / unset) |
| `AGENT_ACCESS_SECRET` | Next.js + Cursor **Runtime Secret** | Shared secret for agent door (≥ 32 chars) |
| `AGENT_USER_PASSWORD` | Next.js or Convex (server-only) | Password for the fixed Better Auth agent user |
| `AGENT_ACCESS_ROLE` | Next.js/Convex | `admin` \| `journalist` \| `viewer` (default `journalist`) |
| `AGENT_ACCESS_EMAIL` | Optional override | Default `cursor-agent@agents.devoetbalgazet.local` |

Also list placeholders in `.env.example` with comments: “Cursor agents only; leave unset in production.”

### Cursor Cloud setup

In the Cloud Agents environment secrets:

1. `AGENT_ACCESS_ENABLED=true`
2. `AGENT_ACCESS_SECRET=<long random>` as **Runtime Secret** (redacted in transcripts)
3. Same values available to the Next.js process the agent starts (`apps/web/.env.local` or process env)

Update `apps/web/AGENTS.md` Cursor section:

```text
Agent admin login:
1. Ensure real Convex dev deployment (not anonymous) — same as human admin.
2. Set AGENT_ACCESS_* secrets.
3. Start web + convex.
4. Open /admin/agent-inloggen, paste AGENT_ACCESS_SECRET, submit.
5. You should land on /admin as journalist (or AGENT_ACCESS_ROLE).
```

## Security checklist (must pass before merge)

- [ ] Agent routes return `404` when disabled.
- [ ] Secret never accepted via query string.
- [ ] Constant-time comparison for the secret.
- [ ] No link to agent login from public or human login pages.
- [ ] `noindex` on agent login page.
- [ ] Production docs say leave disabled by default.
- [ ] Wrong secret does not reveal whether the feature is enabled vs wrong (when enabled: generic 401; when disabled: 404).
- [ ] Agent email not in `ADMIN_BOOTSTRAP_ROLE_MAP`.
- [ ] Disabling the agent: set `users.disabledAt` **or** rotate/remove `AGENT_ACCESS_SECRET` **or** set `AGENT_ACCESS_ENABLED` unset.
- [ ] Unit tests for secret validation / disabled behavior (no live GitHub).

## Test plan

1. **Disabled:** unset env → `GET /admin/agent-inloggen` and `POST /api/admin/agent-session` → 404.
2. **Wrong secret:** enabled → 401 / form error; no cookie; audit failure row.
3. **Correct secret:** cookie set; `GET /admin` renders protected shell; `api.admin.getSession` returns agent email + role.
4. **RBAC:** with role `viewer`, editor mutations still reject (once those exist).
5. **Human path untouched:** `/admin/inloggen` still only offers GitHub.
6. **Disabled membership:** set `disabledAt` on agent user → protected layout redirects to login even with old cookie after session refresh / next `getSession`.

## Implementation sketch (file map)

```text
apps/web/src/app/admin/agent-inloggen/page.tsx      # UI form
apps/web/src/app/admin/agent-inloggen/agent-login-form.tsx
apps/web/src/app/api/admin/agent-session/route.ts   # POST handler
apps/web/src/lib/agent-access.ts                    # enable checks, constant-time compare
convex/agentAccess.ts                              # ensureAgentMembership + logEvent (internal or mutation called via auth path)
convex/schema.ts                                   # agentAccessEvents
docs/admin-auth.md                                 # human + agent sections
apps/web/AGENTS.md                                 # Cursor instructions
.env.example                                       # placeholders
scripts/agent-login.mjs                            # optional cookie helper
```

Exact Better Auth server APIs depend on `@convex-dev/better-auth` helpers already used in `apps/web/src/lib/auth-server.ts` — extend that module rather than inventing a second cookie stack.
