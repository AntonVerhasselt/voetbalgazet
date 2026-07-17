# Phase 3 follow-ups

Post-merge work left after the Keystatic admin MVP landed on `master`.
These items are **not** merge blockers; the Phase 3 code path is already
verified (tests, lint, typecheck, build, and local smoke of public site +
agent admin + `/keystatic`).

## Production Keystatic (hosted editing)

Local/Cursor agents use Keystatic **local** storage + git. Production editors
need GitHub mode.

- [ ] Create/configure the Keystatic GitHub App (repo-scoped)
- [x] Set Vercel env: `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` (Preview + Production)
- [ ] Optional: `KEYSTATIC_GITHUB_READER_TOKEN` + `KEYSTATIC_PREVIEW_BRANCH_PREFIXES` for draft-branch preview
- [ ] Smoke hosted `/keystatic` save → commit on the expected branch
- [ ] Confirm viewers cannot write; Admin/Journalist can

See also: [`keystatic-admin.md`](./keystatic-admin.md).

## Content & taxonomy consistency

- [x] Guard against drift between Keystatic YAML taxonomies
  (`apps/web/content/settings/{divisions,teams}.yaml`) and the Convex
  preference catalog (`convex/lib/preferenceCatalog.ts`) — Vitest parity test
- [x] Wire `illustrationMode` through content loading + shared illustration copy helper
- [x] Datetime timezone policy: editors enter **Europe/Brussels** wall time;
  values are stored as UTC (`normalizeEditorDatetime`)

## Public site / reader launch gaps

Inherited from Phase 2; still open for launch quality:

- [x] `/uitschrijven` + POST `/api/email/uitschrijven` (UI confirm + RFC 8058 one-click)
- [x] Better Auth `onLinkAccount` + sync `subscribers.emailVerifiedAt` on magic-link verify
- [x] Stronger signup abuse controls: Next.js `/api/signup` IP rate limit + Convex IP bucket
- [x] Open Graph / social images: default `opengraph-image` + article/home fallbacks
- [x] Publisher attribution + privacy support address (`privacy@devoetbalgazet.be`)
- [ ] Verwerkersovereenkomsten/DPA's afsluiten + internationale doorgiftegronden
  (ops; copy already documents Convex/Vercel/Resend/PostHog EU)

Soft-gate note: a technical visitor can still bypass the client gate (full body
in HTML, or anonymous Better Auth). That matches the Phase 2 soft-gate
decision; do not treat it as a hard paywall.

## Preview & admin polish

- [x] Confirm GET `/preview/start` behaviour with caching/CDNs (`Cache-Control: private, no-store`, `X-Robots-Tag: noindex`, editor session + allowlists)
- [x] Homepage hero illustration copy follows the featured article via `getIllustrationCopy`
- [x] Link [`keystatic-admin.md`](./keystatic-admin.md) from this docs index
- [ ] Finish remaining checks in `plans/content-admin/04-launch-todos.md`
  (Open Design assets, a11y, GitHub App ops smoke)

## Phase 4 placeholders

Already shown as disabled in `/admin` — no Phase 3 work required:

- Nieuwsbrieven editor / targeting / send (will mint unsubscribe tokens via `createUnsubscribeToken`)
- Abonneebeheer

## Suggested remaining order

1. Hosted Keystatic smoke publish on production (secrets already set)  
2. Optional draft-branch reader token  
3. DPA / processor paperwork  
4. Open Design + mobile a11y launch checks  
