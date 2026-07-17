# Phase 3 — manual checklist (what you do by hand)

This is the operator checklist after the Phase 3 follow-ups PR. Code paths that
are already implemented are marked **done in code**. Items below need a human
in GitHub, Vercel, Convex, or legal ops.

Also pinned at the top of the repo [`README.md`](../README.md) and
[`docs/README.md`](./README.md).

## Open todos (start here)

- [ ] **This checklist** — work through §§1–9 below
- [ ] **Vercel Preview Convex URLs** — Settings → Environment Variables →
  Preview: set **both** (non-regional production hosts unless you intentionally
  use a separate preview Convex deployment):

  ```text
  NEXT_PUBLIC_CONVEX_URL=https://calculating-eel-615.convex.cloud
  NEXT_PUBLIC_CONVEX_SITE_URL=https://calculating-eel-615.convex.site
  ```

  Then redeploy a preview. Confirm `/api/auth/sign-in/social` on the preview
  host returns GitHub OAuth JSON (not 502 with a bad `proxyTarget`).

Canonical product rules (do not change):

- **`siteAccess` and `newsletterSubscribed` are separate.**
- **`/uitschrijven` is newsletter-only.** It never revokes website article access.
- Soft gate remains soft (technical bypass possible); that is intentional.

Related docs: [Keystatic admin](./keystatic-admin.md), [Vercel deploy](./vercel-deploy.md),
[Phase 3 follow-ups](./phase-3-follow-ups.md), plan
[`plans/public-news-site/02-access-and-auth.md`](../plans/public-news-site/02-access-and-auth.md).

---

## 0. Prerequisites (confirm once)

1. Production site: `https://devoetbalgazet.be` (apex primary; `www` → apex).
2. Vercel project root: `apps/web`, monorepo install/build as in [vercel-deploy.md](./vercel-deploy.md).
3. Convex **production** deploy key on Vercel (`CONVEX_DEPLOY_KEY`).
4. Better Auth production secrets on Convex (`BETTER_AUTH_SECRET`, GitHub OAuth if used).
5. You already set Keystatic secrets on Vercel for **Preview** and **Production**:
   - `KEYSTATIC_GITHUB_CLIENT_ID`
   - `KEYSTATIC_GITHUB_CLIENT_SECRET`
   - `KEYSTATIC_SECRET`
   - `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`

---

## 1. Keystatic GitHub App (if not finished)

**Goal:** Hosted `/keystatic` can commit content to this repo.

1. Open GitHub → **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**
   (or reuse the Keystatic app you already created).
2. App name: e.g. `De Voetbalgazet Keystatic`.
3. Homepage URL: `https://devoetbalgazet.be`
4. Callback URL (exact):  
   `https://devoetbalgazet.be/api/keystatic/github/oauth/callback`  
   (If Keystatic docs show a slightly different path for your package version,
   match that path exactly and keep it in sync with production.)
5. Uncheck webhook unless Keystatic requires it for your setup.
6. Repository permissions:
   - **Contents:** Read and write
   - **Pull requests:** Read and write (only if you use branch/PR editing)
   - **Metadata:** Read-only
7. Where can this app be installed? **Only on this account**
8. Create the app → note **Client ID**.
9. Generate a **Client secret** → store in a password manager.
10. Note the **app slug** (URL `github.com/apps/<slug>`).
11. **Install** the app → only repository `AntonVerhasselt/voetbalgazet`.
12. In Vercel → Project → **Settings** → **Environment Variables**, confirm for
    **Production** and **Preview**:
    - `KEYSTATIC_GITHUB_CLIENT_ID` = Client ID
    - `KEYSTATIC_GITHUB_CLIENT_SECRET` = Client secret
    - `KEYSTATIC_SECRET` = long random string (≥ 32 chars; used for Keystatic + draft preview signing)
    - `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` = app slug
13. Redeploy Production after any secret change.

---

## 2. Smoke test: hosted Keystatic publish

**Goal:** One real edit from production admin reaches Git and a Vercel build.

1. Sign in as **Admin** or **Journalist** at `https://devoetbalgazet.be/admin/inloggen`
   (GitHub OAuth against the real Convex production deployment).
2. Open **Artikels** → `/keystatic`.
3. Confirm Keystatic asks for / completes **GitHub App** authorization for the repo.
4. Create or edit a **draft** article:
   - Status: `draft`
   - Fill required fields
   - Save → verify a commit appears on GitHub (expected branch, usually `master` or a content branch)
5. Use **Preview** if configured (see §3). Otherwise skip.
6. Set status to **published**, set `publishedAt` in **Europe/Brussels** local time,
   save again.
7. Wait for the Vercel deployment from that commit.
8. Confirm the article appears on the public site (`/nieuws/<slug>`), homepage/archive
   as expected, and that drafts do **not** appear in sitemap/RSS.

### Role checks

1. Sign in as **Viewer** (or temporarily demote a test user).
2. Open `/keystatic` → expect redirect/403 to `/admin` (no editor UI).
3. Confirm Viewer cannot write via Keystatic; Admin/Journalist can.

---

## 3. Optional: draft-branch preview from GitHub

Only needed if editors work on branches and need hosted draft preview.

1. Create a fine-grained GitHub PAT (or installation token flow) with **Contents: Read-only**
   on `AntonVerhasselt/voetbalgazet`.
2. Vercel → env (Production + Preview as needed):
   - `KEYSTATIC_GITHUB_READER_TOKEN` = token
   - `KEYSTATIC_PREVIEW_BRANCH_PREFIXES=master,main,content/` (adjust if needed)
3. Redeploy.
4. From Keystatic, open preview for a draft on an allowed branch.
5. Confirm `/preview/start` → preview URL is `noindex`, uncached, and gated by
   editor session.

---

## 4. Newsletter unsubscribe (manual product check)

**Done in code:** `/uitschrijven` + `/api/email/uitschrijven` only set
`newsletterSubscribed = false`. They **never** clear `siteAccess`.

Until Phase 4 sends campaigns, there is no automatic footer link. To smoke-test:

1. On a machine with `BETTER_AUTH_SECRET` matching **production Convex**
   `BETTER_AUTH_SECRET`, mint a token (Node one-liner or temporary admin script
   using `createUnsubscribeToken` from `apps/web/src/lib/email-link-token.ts`).
2. Open `https://devoetbalgazet.be/uitschrijven?token=<token>`  
   → confirm page says **nieuwsbrief** only; site access remains.
3. Confirm → expect success copy that website access is unchanged.
4. In Convex dashboard → `subscribers` row:  
   `newsletterSubscribed === false`, `unsubscribedAt` set, **`siteAccess` still true**.
5. Open a gated article while signed in as that reader → still readable.
6. On `/voorkeuren` (verified session) → see “Nieuwsbrief: uit” and CTA  
   **Schrijf me opnieuw in voor de wekelijkse nieuwsbrief**.

Do **not** add a public “uitschrijven van de website” flow. That is out of product scope.

---

## 5. Auth / signup smoke (production)

1. New email via homepage or article gate → preferences → subscribe.
2. Confirm magic-link mail arrives (Resend).
3. Click link → session becomes verified; `/voorkeuren` works.
4. Returning email → continue reading without preference overwrite.
5. Confirm signup abuse: rapid attempts from one IP eventually get rate-limited
   (`/api/signup` 429 or Convex error message).

---

## 6. SEO / social (quick check)

1. Share homepage URL in [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   or similar → default OG image from `/opengraph-image`.
2. Share a published article with/without hero image → correct title/description/image.
3. Confirm privacy + voorwaarden show:
   - `privacy@devoetbalgazet.be`
   - Verantwoordelijke uitgever line

If `privacy@` is wrong for your mailbox provider, update
`PRIVACY_EMAIL` in `apps/web/src/lib/site-config.ts` and redeploy.

---

## 7. Legal / ops (not code)

1. Confirm mailbox/alias for `privacy@devoetbalgazet.be` (or change the constant).
2. Sign DPAs / processor agreements for Convex, Vercel, Resend, PostHog, R2 as needed.
3. Document international transfer grounds for your lawyer.
4. Optional: Belgian legal review of combined siteAccess + initial newsletter opt-in
   (recommended in plans; not a technical blocker).
5. Retention settings in vendor UIs (logs ~90d, analytics ~24m) per
   `plans/public-news-site/06-launch-todos.md`.

---

## 8. Content admin polish (later / non-blocking)

From `plans/content-admin/04-launch-todos.md`:

1. Mobile a11y smoke on `/admin` and `/keystatic` (320–390 px, 44 px targets, keyboard).
2. Official Voetbal Vlaanderen taxonomy import when licensing is clear
   (today: YAML + Convex catalog kept in sync by tests).

---

## 9. Definition of done (Phase 3 ops)

You can treat Phase 3 ops as done when:

- [ ] Hosted `/keystatic` save creates a Git commit on production
- [ ] Published article goes live via Vercel; draft stays off public indexes
- [ ] Viewer cannot edit; Admin/Journalist can
- [ ] Newsletter unsubscribe path preserves `siteAccess` (tested once)
- [ ] Privacy/publisher copy matches real contact channels
- [ ] DPA paperwork tracked (even if not all signed yet)

Phase 4 (campaign editor, Resend send, automatic unsubscribe footers) is separate.
