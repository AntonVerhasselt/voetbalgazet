# Keystatic artikeladmin

Phase 3 stores article content in Git through Keystatic. Convex does not keep an
article copy.

## Local development

Run the regular web app:

```bash
npm run dev:web
```

Keystatic uses local storage outside production. Open `/admin`, sign in through
the real Convex development deployment, then choose **Artikels**. Saves under
`/keystatic` write directly to `apps/web/content/` and
`apps/web/public/images/articles/`.

## GitHub App

Create a GitHub App dedicated to Keystatic and install it only on
`AntonVerhasselt/voetbalgazet`. Use the canonical production URL for the
homepage and callback URLs. Copy these values to every Vercel environment that
hosts the editor:

```text
KEYSTATIC_GITHUB_CLIENT_ID
KEYSTATIC_GITHUB_CLIENT_SECRET
KEYSTATIC_SECRET
NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG
```

Grant repository **Contents: Read and write** and **Pull requests: Read and
write** only if branch/PR editing is used. Admins and journalists still need a
Better Auth redaction role before the `/keystatic` page renders; GitHub access
then authorizes repository writes. Viewer accounts are redirected to `/admin`.
The official `/api/keystatic/*` handler remains responsible for Keystatic's
OAuth callback and signature checks.

## Draft preview

Set a server-only fine-grained GitHub token with read-only repository Contents
permission:

```text
KEYSTATIC_GITHUB_READER_TOKEN
KEYSTATIC_PREVIEW_BRANCH_PREFIXES=master,main,content/
```

The preview start route verifies the redaction session, same-origin request,
branch scope, and `/nieuws/{slug}` destination. It stores a signed, HttpOnly
preview session for 15 minutes and enables Next.js Draft Mode. Preview pages
are uncached, `noindex`, omit PostHog events, and never query subscriber state.

## Publishing

1. Keep new entries at `status: draft`.
2. Use preview for 360 px, 390 px, gated, and full-content checks.
3. Set `status: published` and `publishedAt`.
4. Save. Keystatic commits content and images to Git.
5. Git triggers Vercel. Content validation must pass before the deployment is
   promoted.

Archived and draft entries remain in Git but are absent from public static
params, the homepage, archive, sitemap, and RSS. Roll back content through a
normal Git revert; do not publish through a Convex mutation.
