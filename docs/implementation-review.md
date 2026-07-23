# Implementation review — De Voetbalgazet

**Date:** 17 July 2026  
**Scope:** Full plan set under `plans/` vs current codebase  
**Method:** Plan-by-plan reading, code inspection, and second-pass verification of every Critical finding  
**Constraint:** Review only — no code changes in this pass

---

## Verdict

Phases 1–4 are largely built: public soft-gated news site, Keystatic content admin, Better Auth (admin + reader), agent access door, and newsletter campaign admin (editor, audience, test/send/schedule, Resend/R2). The architecture matches the plans in broad strokes.

It is **not** fully implemented “as requested” end-to-end. Several **cross-component contracts** that the plans treat as launch-blocking for real newsletter sends are missing or wrong. A few security and scale choices also diverge from the planned best path.

**Production campaign sending to real audiences should stay blocked** until Critical items below are fixed (aligns with the spirit of `plans/newsletter-admin-dashboard/09-launch-todos.md`).

---

## What matches the plans well

| Area | Assessment |
|------|------------|
| Deployment topology | Single Next.js app + Convex + Keystatic/Git — matches `00-general-plan.md` |
| Soft article gate | Full body in static HTML + mandatory sheet; lead split; `isGated` — matches public-site plans |
| Reader auth model | Anonymous + magic link; 90-day session; HttpOnly cookies; separate `siteAccess` / `newsletterSubscribed` |
| Consent / unsubscribe separation | Unsub clears newsletter only; `siteAccess` preserved; scanner-safe GET confirm |
| Keystatic SoT | Markdoc articles + YAML settings; no Convex article body copy; build validation |
| Dual admin gate | Better Auth roles for `/keystatic` UI; GitHub App for hosted writes |
| Draft preview | Signed cookie, branch/path allowlists, gated/ungated mobile frames, noindex |
| Agent access | Secret door, fixed email/role, audit events, CLI helper — product intent matches |
| Newsletter MVP spine | Campaign CRUD, TipTap/`@react-email/editor`, R2 uploads, audience confirm, test → send/schedule, webhooks |
| Locked campaign footer | Injected server-side with company/KBO/privacy/terms paths |
| Design tokens | Paper/ink/accent + illustration palette in `globals.css` (without Open Design source copy) |
| Docs for ops | Admin auth, Vercel/Convex, Keystatic, Phase 3/4 checklists present |

---

## Critical issues

These break stated contracts, compliance, or create a serious security surface. Verified in code on this review pass.

### C1 — Newsletter article bootstrap is not the planned 30-day token exchange

**Plans:** `public-news-site/01-product-decisions.md`, `02-access-and-auth.md` Flow 4, `newsletter-admin-dashboard/10-cross-component-contracts.md` Contract 2–3  
**Code:** `apps/web/src/app/email/artikel/route.ts`, `convex/auth.ts` (`magicLink` `expiresIn: 60 * 15`)

`/email/artikel` only forwards `token` to Better Auth magic-link verify (15 minutes). There is no purpose-bound `article_access` token (30 days), no `siteAccess` check on exchange, and no send-time rewrite of `/nieuws/...` links to per-recipient bootstrap URLs.

**Impact:** Newsletter deep-links cannot unlock articles as specified. Campaign article access from email is effectively broken for the planned product.

### C2 — Preferences footer / bootstrap is not purpose-bound

**Plans:** `newsletter-admin-dashboard/05-sending-delivery-and-transactional.md` (footer preferences), Contract 2 (`preferences_access`)  
**Code:** `convex/lib/compliance.ts` (`preferencesPath: "/voorkeuren"`), `convex/newsletterSend.ts` (static preferences URL at render), `apps/web/src/app/email/voorkeuren/route.ts` (magic-link proxy only)

Campaign footer uses a static `/voorkeuren` URL. `/email/voorkeuren` is again a magic-link passthrough, not a dedicated preferences bootstrap with ownership checks.

**Impact:** Preference management from newsletters does not follow the verified-session + token ownership contract.

### C3 — RFC 8058 one-click unsubscribe POST hits the wrong URL

**Plans:** Contract 2 — GET `/uitschrijven` = confirm shell; POST `/api/email/uitschrijven` = one-click  
**Code:** `convex/newsletterSend.ts` sets `List-Unsubscribe: </uitschrijven?token=…>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`; POST handler only exists on `apps/web/src/app/api/email/uitschrijven/route.ts`

Mail clients POST to the List-Unsubscribe URL. That URL is the page route (GET-only), not the API route.

**Impact:** One-click unsubscribe from Gmail/Apple Mail/etc. will not run `confirmUnsubscribe`. Compliance and deliverability risk.

### C4 — Public Convex agent mutations expose the agent door off the Next gate

**Plans:** `agent-access/01-architecture-and-flow.md` — Next.js is the door; rate limits and UX live there  
**Code:** `convex/agentAccess.ts` — `prepareAgentSession` and `recordAgentAccessEvent` are public `mutation`s; secret is an argument

Anyone who can call the Convex deployment HTTP/client API can brute-force or spam these without the Next rate limiter. Successful secret verification can provision/update the agent credential user.

**Impact:** Second attack surface for a high-privilege admin identity; audit spam.

---

## Warning issues

### Public site / access

| ID | Issue | Plan cite | Code |
|----|-------|-----------|------|
| W1 | Homepage missing search, “Het laatste”, and category/reeks sections | `01-news-site.md`, `04-public-ux-and-analytics.md` | `(public)/page.tsx`, `site-header.tsx` |
| W2 | Archive filters are always-visible selects, not mobile sheet/drawer + chips | `04-public-ux` | `archive-browser.tsx` |
| W3 | No Pagefind (or equivalent) lead-scoped public search; archive is client substring filter | `03-static-content-and-seo.md` | `archive-browser.tsx` |
| W4 | Large PostHog taxonomy gap (read depth, share, search, welcome/newsletter link events, CWV, etc.) | `04-public-ux-and-analytics.md` | `lib/analytics.ts`, gate/signup components |
| W5 | Gate unlock = any Better Auth session, not an explicit `siteAccess` / reader entitlement claim | `02-access-and-auth.md` | `article-access-gate.tsx` |
| W6 | No article share UI / `article_share_clicked` | `03` / `04` | `article-page-content.tsx` |
| W7 | JSON-LD missing `image` array and publisher `logo` | `03-static-content-and-seo.md` | `lib/seo.ts` |
| W8 | `/uitschrijven` not disallowed in `robots.txt` (token pages can be crawled) | `03` | `robots.ts` |
| W9 | Homepage never switches CTA to “already subscribed” when session confirms | `04` | `(public)/page.tsx`, `signup-form.tsx` |
| W10 | “Al abonnee?” is helper text, not a distinct secondary returning CTA | `01` / `04` | `signup-form.tsx` |
| W11 | Next.js signup IP rate limit is in-memory (weak on serverless); Convex bucket is real control | `02` abuse controls | `signup-ip-rate-limit.ts` |
| W12 | Unsubscribe tokens embed raw email in signed payload (PII recoverable from URL) | Contract 2: opaque, no readable PII | `convex/lib/emailLinkToken.ts`, web twin |

### Content admin / Keystatic / agent

| ID | Issue | Plan cite | Code |
|----|-------|-----------|------|
| W13 | `excludeFromSearch` is stored but never applied in archive/search/sitemap filtering | `content-admin/02-article-model-and-publishing.md` | `lib/content.ts` `getPublishedArticles` |
| W14 | No Git→Convex taxonomy sync (dry-run + execute); runtime uses hardcoded `preferenceCatalog` | `content-admin/05-taxonomies-and-settings.md` | `preferenceCatalog.ts` + YAML + Convex tables |
| W15 | Storage mode inferred from GitHub App slug, not explicit `KEYSTATIC_STORAGE` | `agent-access/02-keystatic-boundary.md` | `keystatic.config.ts` |
| W16 | `branchPrefix: "content/"` steers editors off production-branch MVP flow | `content-admin/01-keystatic-architecture.md` | `keystatic.config.ts` |
| W17 | Markdoc pull-quote / optional factbox missing; only default blockquote | `02-article-model` | `keystatic.config.ts` |
| W18 | Publish confirm UX and in-editor status/`publishedAt`/slug-immutability rules weak vs plan | `02` / `03-admin-ui-ux.md` | Keystatic schema (build-time validation only for several blockers) |
| W19 | Agent rate limits are Next/process-local only | `agent-access/01` | `lib/agent-access.ts` |

### Newsletter / delivery / ops

| ID | Issue | Plan cite | Code |
|----|-------|-----------|------|
| W20 | No marketing kill switch | `07-analytics-compliance-and-operations.md`, Fase 6/8 | absent |
| W21 | No failed-recipient recovery mutation/UI | `05-sending…`, `06-admin-ux` | results pages are aggregates only |
| W22 | No retention/cleanup crons (Resend finalized, drafts, delivery events) | `07`, `05` | no `convex/crons.ts` |
| W23 | `usedBySentEmail` never set on R2 media after send | `02` / `03` asset lifecycle | `r2.ts` |
| W24 | Transactional catalog incomplete (`preferences_changed`, admin send alerts, disable/restore, test-before-publish) | Contract 5 / `05` | `newsletterAdmin.ts` / auth welcome path |
| W25 | Cancel schedule resets to `draft` instead of terminal `cancelled` | `01-product-decisions` status model | `newsletterSend.cancelSchedule` |
| W26 | Audience prepare scans all `newsletterSubscribed` then filters in memory; division projection indexes unused for selection | `04-audience-and-segmentation.md` | `listEligibleSubscriberPage` |
| W27 | `prepareRecipients` ends with `.collect()` of all `prepared` recipients before enqueue | scale / `08` phases | `newsletterSend.ts` ~593–598 |
| W28 | Per-recipient `resend.sendEmail` in mutation batches instead of planned body-once + provider batching/workpool | `05` | `enqueueRecipientBatch` |
| W29 | `previewAudience` paginates/loads full subscribed set into the query path | `04` / 100k target | `newsletterCampaigns.ts` / related |
| W30 | Test invalidation too broad (any draft field) / `contentMatchesTest` ignores preheader | `05` | `newsletterSend.ts`, campaign update |
| W31 | Dual renderers: browser `composeReactEmail` vs Convex TipTap→HTML walker — parity not guaranteed | `02-editor-and-content.md`, `03-newsletter.md` | editor + `emailRender.ts` |
| W32 | Soft/hard bounce distinction weak; aggregate increments may not stay monotone under out-of-order webhooks | `05` | `newsletterDelivery.ts` |
| W33 | Alt-text / empty preheader not blocked before send | `02` validation | send path + UI checklist |
| W34 | Admin newsletter PostHog events not implemented | `07` | admin UI |
| W35 | Welcome/magic-link mail uses raw Resend HTTP `fetch`, bypassing Resend component + transactional definitions | `05` / general Resend component choice | `convex/auth.ts` |
| W36 | Shared root `emails/` package missing; logic lives only in Convex | `00-general-plan.md` tree | no `/emails` |
| W37 | Open Design source still not copied into `design/open-design/` | `ui-ux/`, `00` | stub README only |
| W38 | GDPR subject rights are mailto/support-only; no admin helpers to fulfill export/erase | `00` NFR + privacy launch todos (support process intended) | privacy pages; no tooling |
| W39 | Plans/docs stale: `plans/README.md` still says codebase “Not started”; design checklist lags code | meta | `plans/README.md`, `ui-ux/01-design-style.md` |
| W40 | Thin automated tests for send pipeline, webhooks, gate e2e, role-enforced newsletter mutations | `08` test strategy | `tests/` mostly unit helpers |

---

## Info issues (polish, deferred, or intentional MVP cuts)

| ID | Issue |
|----|-------|
| I1 | Legal pages are shortened vs full concept copy in `05-privacy-and-terms-copy.md` (entity/KBO still present) |
| I2 | Article body uses display serif; UX plan suggested UI sans for body size band |
| I3 | Leftover dismiss/close CSS for gate despite “geen Niet nu” |
| I4 | RSS has no media enclosure; no Google News sitemap |
| I5 | Gate a11y: limited `aria-describedby` / `aria-invalid` wiring |
| I6 | Preferences form lacks sticky mobile save |
| I7 | Soft build warnings (headline length, large image, future date) not implemented |
| I8 | Image type/size limits not enforced in Keystatic |
| I9 | `/keystatic` not in `robots.txt` disallow (page is `noindex`) |
| I10 | Province default always set in Keystatic vs optional in plan |
| I11 | Hero credit required whenever hero image present (stricter than plan) |
| I12 | Preview lacks social-metadata / homepage-card preview modes |
| I13 | Division-based From address strategy not implemented (single sender) |
| I14 | No UTM injection / link-check / plaintext preview tabs |
| I15 | Confirm send uses simple button, not “type VERSTUREN” |
| I16 | Abonnees admin is masked list only (no search/suppressions/history) |
| I17 | Audit events written but no campaign activity timeline UI |
| I18 | Manual “save revision” / restore-as-draft UX incomplete |
| I19 | Inter not loaded via `next/font`; paper-grain overlay absent |
| I20 | Stricter TS options (`noUncheckedIndexedAccess`, etc.) not enabled |
| I21 | Dual token implementations (Convex WebCrypto vs Next Node HMAC) must stay forever compatible |
| I22 | Archive loads all published entries client-side (fine for small MVP) |
| I23 | Soft gate HTML bypass remains accepted product decision — document for ops, not a bug |

---

## Launch / manual todos (not code bugs)

These remain intentionally open in plan launch docs. Do not treat as failed implementation unless you decide they are now in scope for code:

- Hosted Keystatic GitHub App smoke + role write checks (`docs/phase-3-manual-checklist.md`)
- Vercel Preview Convex URL pair (`README.md` / `docs/phase-3-follow-ups.md`)
- Official Voetbal Vlaanderen taxonomy import confirmation
- DMARC, inbox client tests, R2 CORS/cache headers
- Open/click tracking activation decisions
- Legal/DPA / Belgian review / welcome copy sign-off
- Mobile device matrix / Rich Results / Search Console
- Production leave `AGENT_ACCESS_SECRET` unset
- Kill-switch / recovery / loadtest ops once features exist

---

## Efficiency and “best way” assessment

### Good choices
- Static SSG for public articles; Convex only for auth/subscribers/newsletter
- Soft gate (discoverable HTML) as explicitly planned
- Custom auth wrappers (`viewer` / `editor` / `admin`) instead of repeated checks
- Immutable send revisions + recipient idempotency keys
- Division preference projection table exists (even if unused for audience select yet)
- Locked footer rendered server-side (cannot be stripped in editor)

### Not the best / most efficient vs plans

1. **Audience selection** should use `subscriberDivisionPreferences` indexes; full subscribed scan + in-memory filter will degrade as list grows (W26).
2. **Prepare → enqueue** should not `.collect()` every prepared recipient in one mutation (W27).
3. **Send path** should move toward provider batching / workpool as planned, not N× `sendEmail` in mutation loops (W28).
4. **Email rendering** should share one module (`emails/`) between browser preview and server send (W31, W36).
5. **Taxonomy** should be one Git catalog + sync, not three sources held by Vitest (W14).
6. **Agent secret verification** should be Next-only or `internalMutation` behind a trusted route (C4).
7. **Token design** should be opaque IDs (or hashed lookups), not base64 email payloads (W12, C1–C2).

---

## Coverage by plan area

| Plan area | Completeness | Notes |
|-----------|--------------|-------|
| `00-general-plan` | High with gaps | Missing `emails/`, Open Design copy, export/erase tooling |
| Public news site | High for MVP core; medium for UX/analytics | Bootstrap tokens Critical; homepage/archive/search Warning |
| Content admin | High for Phase 3 MVP | Hosted GitHub still manual; `excludeFromSearch` dead |
| Agent access | High product; Critical security hardening needed | Public Convex mutations |
| Newsletter admin | Medium–high spine; low on compliance contracts | C1–C3 block “done” for live sends |
| UI/UX | Medium | Tokens present; pixel parity blocked; some layout gaps |
| Launch todos | Open by design | Track separately from code gaps |

---

## Suggested fix priority (for a later pass — not done now)

1. **C3** — Point `List-Unsubscribe` (and one-click POST) at `/api/email/uitschrijven?token=…`; keep GET confirm on `/uitschrijven`.
2. **C1 / C2** — Implement opaque purpose-bound tokens + exchange routes; rewrite preferences + article links at send time.
3. **C4** — Make agent prepare/audit internal or Next-trusted only; add Convex-side rate limiting if public surface remains.
4. **W26–W28** — Scale-safe audience + prepare + enqueue before real list sizes.
5. **W20–W22** — Kill switch, recovery, retention before production ops.
6. **W13 / W1–W4 / W34** — Product polish and analytics completeness.
7. **W36–W37 / W39** — Repo structure and plan doc hygiene.

---

## Double-check log

Second-pass verification performed on:

- [x] `/email/artikel` and `/email/voorkeuren` are magic-link proxies (not 30-day bootstrap)
- [x] Magic link TTL is 15 minutes in `convex/auth.ts`
- [x] `List-Unsubscribe` URL is `/uitschrijven?token=…` while POST API is `/api/email/uitschrijven`
- [x] `prepareAgentSession` is a public Convex mutation taking `secret`
- [x] Unsubscribe token payload contains email plaintext (signed)
- [x] `cancelSchedule` sets `status: "draft"`
- [x] `listEligibleSubscriberPage` uses `by_newsletter_subscribed` + in-memory filters
- [x] `prepareRecipients` `.collect()`s all prepared recipients
- [x] `excludeFromSearch` parsed but unused in `getPublishedArticles`
- [x] No `/emails` directory; `design/open-design/` is README-only
- [x] `NEWSLETTER_LIVE_SEND` exists; no marketing kill switch beyond that

---

## Out of scope for this document

- Fixing any of the above
- Re-running full E2E against live Resend/GitHub/Vercel
- Legal advice on GDPR sufficiency of support-only DSR
