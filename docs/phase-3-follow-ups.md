# Phase 3 follow-ups

Post-merge work left after the Keystatic admin MVP landed on `master`.
These items are **not** merge blockers; the Phase 3 code path is already
verified (tests, lint, typecheck, build, and local smoke of public site +
agent admin + `/keystatic`).

## Production Keystatic (hosted editing)

Local/Cursor agents use Keystatic **local** storage + git. Production editors
need GitHub mode.

- [ ] Create/configure the Keystatic GitHub App (repo-scoped)
- [ ] Set Vercel env: `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`
- [ ] Optional: `KEYSTATIC_GITHUB_READER_TOKEN` + `KEYSTATIC_PREVIEW_BRANCH_PREFIXES` for draft-branch preview
- [ ] Smoke hosted `/keystatic` save → commit on the expected branch
- [ ] Confirm viewers cannot write; Admin/Journalist can

See also: [`keystatic-admin.md`](./keystatic-admin.md).

## Content & taxonomy consistency

- [ ] Guard against drift between Keystatic YAML taxonomies
  (`apps/web/content/settings/{divisions,teams}.yaml`) and the Convex
  preference catalog (`convex/lib/preferenceCatalog.ts`) — add a test or
  single source of truth
- [ ] Wire or remove unused `illustrationMode` frontmatter (collected in
  Keystatic, not used in `apps/web/src/lib/content.ts` rendering)
- [ ] Decide datetime timezone policy for editors (values are normalized as UTC)

## Public site / reader launch gaps

Inherited from Phase 2; still open for launch quality:

- [ ] `/uitschrijven` (and RFC 8058 one-click where applicable)
- [ ] Better Auth `onLinkAccount` + sync `subscribers.emailVerifiedAt` on magic-link verify
- [ ] Stronger signup abuse controls (e.g. IP rate limit) beyond per-email limits
- [ ] Open Graph / social images on home and article metadata
- [ ] Publisher attribution, privacy support address, DPA/retention as in
  `plans/public-news-site/06-launch-todos.md`

Soft-gate note: a technical visitor can still bypass the client gate (full body
in HTML, or anonymous Better Auth). That matches the Phase 2 soft-gate
decision; do not treat it as a hard paywall.

## Preview & admin polish

- [ ] Confirm GET `/preview/start` behaviour with caching/CDNs (mutates Draft
  Mode + cookie; already gated by editor session + allowlists)
- [ ] Homepage hero illustration copy should follow the featured article, not
  hardcoded strings
- [ ] Link [`keystatic-admin.md`](./keystatic-admin.md) from this docs index
  (done when this file ships)
- [ ] Finish remaining checks in `plans/content-admin/04-launch-todos.md`
  (Open Design assets, a11y, GitHub App ops)

## Phase 4 placeholders

Already shown as disabled in `/admin` — no Phase 3 work required:

- Nieuwsbrieven editor / targeting / send
- Abonneebeheer

## Suggested order

1. Hosted Keystatic secrets + one real publish on production  
2. Taxonomy single-source / drift test  
3. Unsubscribe + verified-identity linking  
4. SEO images and remaining launch-todo legal/ops items  
