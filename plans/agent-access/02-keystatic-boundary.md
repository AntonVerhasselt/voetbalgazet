# Agent access — Keystatic boundary

## The dual gate (planned)

From [`../content-admin/01-keystatic-architecture.md`](../content-admin/01-keystatic-architecture.md):

| Gate | Controls |
|------|----------|
| Better Auth Admin/Journalist | Who may open `/keystatic` and `/preview/*` |
| Keystatic GitHub App OAuth | Who may **write** Markdoc/images to the GitHub repo |

Hosted editing (`storage.kind = "github"`) therefore needs a **GitHub-linked** browser session for Keystatic, separate from Better Auth.

## What the agent access point unlocks

| Capability | With agent session only? |
|------------|--------------------------|
| `/admin` shell / overview | Yes |
| Future Convex nieuwsbrieven / abonnees / instellingen | Yes (per role) |
| Open `/keystatic` page gate (Better Auth) | Yes, if role is Admin/Journalist |
| **Save/publish via Keystatic GitHub mode** | **No** — still needs Keystatic GitHub App login + repo write |
| Public site / signup | Unaffected |

So: an agent without a GitHub account **cannot** fully E2E-test “journalist clicks Save in hosted Keystatic and a commit appears on GitHub” using only this access point.

## How agents should test articles instead

### Default for Cursor Cloud Agents — local Keystatic + git

When the agent runs the Next.js app against the **repo checkout** in its VM:

1. Keystatic uses `storage.kind = "local"` (already the planned local-dev mode).
2. The agent access session satisfies the Better Auth page gate for `/keystatic` (role `admin` by default).
3. Saves write Markdoc/images into `apps/web/content/...` and `public/images/articles/...` on disk.
4. The agent commits and pushes on its feature branch with existing Cursor git credentials — the same way it already ships code.

This matches how agents work and avoids GitHub 2FA in the browser.

**Config rule (to implement with Keystatic):**

```text
KEYSTATIC_STORAGE=local|github

Default:
  - production / Vercel hosted admin → github
  - local + Cursor agent → local
```

Detect agent/local via env (`KEYSTATIC_STORAGE`, or `VERCEL !== "1"`), never via trusting the client.

### Explicitly discouraged

- Using local Keystatic against a checkout to mutate **production content on `master`** from an ephemeral agent without a PR review.
- Agents should edit on a **feature branch** and open a PR (normal Cursor workflow).

Document this in Keystatic launch todos and in `apps/web/AGENTS.md` when Keystatic lands.

## Optional future: bot GitHub for hosted Keystatic E2E

Out of scope for the agent access point MVP, but recorded here:

- Separate bot GitHub user + TOTP in Cursor Secrets.
- Completes **both** Better Auth GitHub login **and** Keystatic GitHub App login.
- Use only for rare full-stack E2E of hosted GitHub mode.
- Do not use a personal 2FA account.

The agent access secret path remains the default for daily Convex-admin testing.

## Decision summary

```text
Daily Cursor testing
  ├─ Custom admin  → AGENT_ACCESS_SECRET → Better Auth session
  └─ Articles      → Keystatic local + git on feature branch

Rare hosted Keystatic E2E
  └─ Bot GitHub + TOTP (separate runbook; not this access point)
```
