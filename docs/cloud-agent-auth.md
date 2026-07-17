# Cloud agent auth (GitHub + Convex)

Why Convex "login with GitHub" keeps breaking in Cloud Agents, and how to
make it permanent.

## Two different "GitHub logins"

| What | Purpose | Persists across agent pods? |
|------|---------|-------------------------------|
| Cursor → GitHub (git/`gh`) | clone, push, PRs | Yes — Cursor injects a short-lived token each run |
| `npx convex login` (GitHub OAuth) | personal Convex CLI session | **No** — token is written to `~/.convex/config.json` on that VM only |

Logging into Convex with GitHub OAuth in a setup thread authorizes **that
machine**. The next agent pod is a new VM. Unless you use a **snapshot that
still has that home-directory file** *and* the session has not been revoked,
`npx convex login` is gone. It is not a Cursor secret and it is not immortal.

Do **not** put your GitHub or Convex password in secrets. Convex CLI permanence
for agents is a **deploy key**, not a password.

## Permanent fix (recommended)

Use a **dev deploy key** for `spotted-spider-192` (the shared cloud-agent
dev deployment for admin auth). Store it as a Cursor Cloud Agent secret so
every new pod receives `CONVEX_DEPLOY_KEY` automatically.

### 1. Create the deploy key (once, on your laptop or in any logged-in session)

In [Convex Dashboard](https://dashboard.convex.dev) → project `voetbalgazet` →
deployment `spotted-spider-192` → **Settings** → **Deploy keys** →
**Generate a deploy key**.

- Name: `cursor-cloud-agent`
- Permissions: enough for agent CLI use (deploy code, read/write data, env,
  logs). For CI-only deploy you could use less; for Cloud Agents prefer the
  broader agent set.

The value looks like `dev:spotted-spider-192|...`.

Or, on a machine where you are already logged in with `npx convex login`:

```bash
npx convex deployment token create cursor-cloud-agent \
  --deployment spotted-spider-192
```

Copy the printed key (do not commit it).

### 2. Add it as a Cursor Cloud Agent secret

Open the environment:

https://cursor.com/dashboard/cloud-agents/environments/r/github.com/antonverhasselt/voetbalgazet

Add secret:

| Name | Value |
|------|--------|
| `CONVEX_DEPLOY_KEY` | the `dev:spotted-spider-192|...` key |

Rebuild / refresh the environment if the UI asks you to, then start a **new**
agent (existing pods will not magically gain a secret that was missing at boot).

### 3. Bootstrap on each agent

```bash
npm ci
node scripts/bootstrap-convex-cloud-agent.mjs
```

That script:

1. Requires `CONVEX_DEPLOY_KEY` in the environment (from Cursor secrets).
2. Writes it into root `.env.local` (gitignored).
3. Runs `npx convex dev --once` non-interactively against that deployment.
4. Syncs `NEXT_PUBLIC_CONVEX_*` into `apps/web/.env.local`.

After that, `npm run dev` / `npx convex data` / admin GitHub login against the
real `.convex.site` URL work **without** `npx convex login`.

Optional: put the same two commands in the environment **Install** / setup
command so every agent boots ready.

## Modes (when to use which)

| Mode | Auth | Admin GitHub login (`/admin`) | Use when |
|------|------|-------------------------------|----------|
| Deploy key (`CONVEX_DEPLOY_KEY`) | Cursor secret | Works (real `*.convex.site`) | Admin / auth / shared cloud data |
| Anonymous (`npm run dev:convex:agent`) | None | Does **not** work | Public site / unit work without auth |
| `npx convex login` OAuth | Per-VM session | Works until the pod dies | Local laptop only — **not** for Cloud Agents |

## GitHub for git (usually already fine)

`gh auth status` and `git push` use Cursor’s injected installation token.
That is unrelated to Convex’s “Sign in with GitHub” OAuth. If git push fails,
reconnect the GitHub app for Cloud Agents in the Cursor dashboard — do not
paste a personal password into secrets.

## Quick diagnosis

```bash
# Git for the repo (Cursor token) — should work
gh auth status
git ls-remote origin HEAD

# Convex personal OAuth — expected MISSING on fresh pods
test -f ~/.convex/config.json && echo 'oauth session present' || echo 'no oauth session'

# Permanent path — must be set via Cursor secret
test -n "$CONVEX_DEPLOY_KEY" && echo 'deploy key present' || echo 'MISSING CONVEX_DEPLOY_KEY secret'
```

If the last line says missing, add the secret (step 2) and start a new agent.
