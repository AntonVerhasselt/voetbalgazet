# Open todos — De Voetbalgazet

Remaining **manual ops**, **launch checks**, and a few **known gaps**.
Implementation for planned features is done; do not treat this as a build backlog.

Canonical rules (do not change):

- `siteAccess` and `newsletterSubscribed` are separate.
- `/uitschrijven` is newsletter-only; it never revokes website article access.
- Soft gate remains soft (technical bypass possible); that is intentional.

---

## 1. Vercel / Convex preview

- [ ] **Vercel Preview Convex URLs** — Settings → Environment Variables →
  Preview: set **both** (non-regional hosts unless you use a separate preview
  Convex deployment):

  ```text
  NEXT_PUBLIC_CONVEX_URL=https://calculating-eel-615.convex.cloud
  NEXT_PUBLIC_CONVEX_SITE_URL=https://calculating-eel-615.convex.site
  ```

  Redeploy a preview. Confirm `/api/auth/sign-in/social` returns GitHub OAuth
  JSON (not 502 with a bad `proxyTarget`).

  See [`docs/vercel-deploy.md`](./docs/vercel-deploy.md).

---

## 2. Hosted Keystatic (production editing)

Code path (`/keystatic`, GitHub mode, preview sessions, role gate) is shipped.
Secrets for Preview + Production are already set. Still needed:

### GitHub App + smoke

- [ ] Create/configure the Keystatic GitHub App (repo-scoped to
  `AntonVerhasselt/voetbalgazet`)
- [ ] Homepage `https://devoetbalgazet.be`; callback
  `https://devoetbalgazet.be/api/keystatic/github/oauth/callback`
- [ ] Permissions: Contents R/W; Metadata read; optionally PRs R/W
- [ ] Confirm Vercel secrets match Client ID / secret / app slug; redeploy
- [ ] Smoke: Admin/Journalist save draft → Git commit; publish → live on site;
  draft off sitemap/RSS
- [ ] Smoke: Viewer cannot open `/keystatic`

Details: [`docs/keystatic-admin.md`](./docs/keystatic-admin.md).

### Optional draft-branch preview

- [ ] `KEYSTATIC_GITHUB_READER_TOKEN` + `KEYSTATIC_PREVIEW_BRANCH_PREFIXES`
- [ ] Confirm preview is `noindex`, uncached, editor-session gated

### Manual polish

- [ ] Mobile a11y smoke on `/admin` and `/keystatic` (320–390 px, 44 px targets,
  keyboard, virtual keyboard)
- [ ] Publish confirm usable on mobile; status not color-only
- [ ] Mobile Core Web Vitals on published articles

---

## 3. Public site — production smoke

Code paths exist; these need a human on production (or a real preview):

### Auth / email

- [ ] New email via gate → preferences → subscribe; magic-link arrives
- [ ] Click link → verified session; `/voorkeuren` works
- [ ] Returning email continues without preference overwrite
- [ ] Rapid signup attempts get rate-limited
- [ ] Newsletter unsubscribe smoke: mint token → `/uitschrijven` →
  `newsletterSubscribed === false`, `siteAccess` still true; resubscribe CTA
- [ ] Bounce- en complaintflow end-to-end (live Resend webhook)
- [ ] Welkomst-/verificationmail juridisch en redactioneel nalezen

### SEO / quality

- [ ] OG share check (homepage + article with/without hero)
- [ ] Mobile-first flows op 320, 360, 390 en 768 px (incl. echte iOS/Android)
- [ ] Gate/keyboard/safe-area; geen hover-only acties op homepage/artikel/archief
- [ ] Rich Results Test; Search Console (+ optioneel Google News)
- [ ] Sitemap (`/sitemap.xml`), robots, excerpt-RSS (`/feed.xml`) valideren
- [ ] Accessibility- en keyboardtest van gate en voorkeuren
- [ ] Core Web Vitals en gate-layoutshift

### Content policy

- [ ] Officiële Voetbal Vlaanderen-bron en toegestane gebruikswijze bepalen
- [ ] Officiële club-/reekstaxonomie importeren wanneer licentie duidelijk is
  (huidige YAML + Convex catalog is MVP; parity via tests)
- [ ] Redactioneel beleid voor `isGated: false` vastleggen

---

## 4. Legal / privacy / ops

Copy and publisher line are in code (`privacy@`, `PUBLISHER_LINE`, KBO). Still:

- [ ] Mailbox/alias voor `privacy@devoetbalgazet.be` bevestigen (of
  `PRIVACY_EMAIL` in `apps/web/src/lib/site-config.ts` wijzigen)
- [ ] Definitieve juridische entiteiten, regio's en subverwerkers van Convex,
  Vercel, Resend, PostHog en R2 controleren
- [ ] Verwerkersovereenkomsten/DPA's afsluiten
- [ ] Internationale doorgiftegronden documenteren
- [ ] Vendor-retentie instellen: security/errorlogs ~90d, analytics ~24m,
  support ~24m (app retention cron already cleans newsletter delivery/audits)
- [ ] Supportprocedure voor inzage, correctie en volledige verwijdering testen
- [ ] Consentcopy gelijk aan live formulier nalezen (version `2026-07-16`
  already matches in code)
- [ ] Belgische juridische review van gecombineerde siteAccess + initiële
  nieuwsbriefinschrijving (aanbevolen; geen technische blocker)

---

## 5. Newsletter admin — launch

Provider setup (Resend, R2, PostHog, DNS/DMARC/DKIM) is done. Campaign footer,
List-Unsubscribe headers, indicative open/click labels, 5 MB image allowlist,
kill switch, live-send guard, Brussels scheduling, audience projection, Admin
recovery, and retention cleanup are implemented.

### Still to configure / verify

- [ ] Vaste campagnefooter juridisch/copy nalezen vóór live sends
- [ ] Open-/clicktracking in Resend dashboard bevestigen/activeren
- [ ] `List-Unsubscribe` one-click in echte inboxclients testen
- [ ] Gmail, Outlook en Apple Mail inbox-/spamtests
- [ ] R2 CORS beperken tot admin origins; cacheheaders voor e-mailbeelden
- [ ] Animated-GIF clientwaarschuwing (server limiet 5 MB bestaat; geen UI-warning)
- [ ] Eerste Admin-/Journalist-/(optioneel) Vieweraccounts + interne testadressen
- [ ] Transactionele templates: in prod preview → testmail → als Admin publiceren;
  E2E triggers zonder tokens in logs/UI
- [ ] Admin disable/rollback voor gepubliceerde dienstmailrevisies
  (edit/test/publish bestaat; disable/rollback UI ontbreekt)
- [ ] Privacyverklaring actualiseren voor open-/click-/deliverystatus
- [ ] Open tracking juridisch/privacytechnisch bevestigen
- [ ] Retention/DSR: suppressions + subscriber deletion/pseudonymization E2E
- [ ] Preference-projection dry-run vóór eventuele rebuild-writes
- [ ] Loadtest ≥ 100.000 subscribers; Convex/Resend quota check
- [ ] Production: `NEWSLETTER_LIVE_SEND`, kill switch, schedule/cancel/send-now,
  recovery smoke op echte env

### Pilot (gate for full list)

- [ ] Newsletteradmin + editor op 320–768 px; preview in echte inboxclients
- [ ] HTML-grootte / Gmail clipping; footerlinks ≥ 44 px
- [ ] Interne production-smoketest; kleine echte pilot
- [ ] Delivery/bounce/complaint/open/click + uitschrijf-/voorkeurenlinks controleren
- [ ] Alerts en runbooks; daarna pas volledige actieve lijst

Ops: [`docs/phase-4-newsletter.md`](./docs/phase-4-newsletter.md).
Keep `NEWSLETTER_LIVE_SEND=false` on agent deployments when not testing.

---

## 6. Agent access (ops)

Code path is shipped and documented (`docs/admin-auth.md`, `apps/web/AGENTS.md`).
Env checks:

- [ ] Real Convex dev deployment available to agents (not anonymous-only)
- [ ] `AGENT_ACCESS_SECRET` als Cursor Runtime Secret; Next leest hem bij
  `npm run dev:web`
- [ ] Smoke: `/admin/agent-inloggen` → `/admin` as admin
- [ ] Leave `AGENT_ACCESS_SECRET` unset on production Vercel

---

## 7. Known later gaps

- [ ] Pagefind (or similar) full-text archive search beyond MVP surface
- [ ] Full DSR export/erase tooling (privacy copy points to support process)
- [ ] Provider batching / workpool at 100k scale
- [ ] Dual renderer perfect visual parity (shared `@devoetbalgazet/emails`)

---

## 8. AI journalist pipeline

Idea review (generate → edit notes/questions → approve/reject) is implemented.
Readable reeks keys stay user-facing; Neon `CHP_*` ids are mapping-only.
Explainer: [`plan/11-pipeline-data-structure-explained.md`](./plan/11-pipeline-data-structure-explained.md).

### Blocking real agent coverage

- [ ] **Supply Neon `series.id` for all remaining reeksen** (today only Antwerp
  seed is mapped: `CHP_130005`, `CHP_136335`, `CHP_134688`). Then extend only
  `KNOWN_NEON_SERIES` in `convex/lib/neonSeriesMap.ts`. Public keys stay
  readable — never use `CHP_*` as UI / signup / pipeline keys.  
  See [`plan/06-open-questions.md`](./plan/06-open-questions.md).
- [ ] **Deploy Eve + AI Gateway** and set Convex env for real research:
  - `EVE_AGENT_URL`
  - `EVE_INVOKE_TOKEN`
  - `PIPELINE_RESEARCH_MODE=eve`
  - Production: `PIPELINE_ENV=production` (fail-closed; no silent fixture fallback)
  - Agent needs `NEON_DATABASE_URL` (read-only) for SQL
- [ ] Optional: `AI_GATEWAY_API_KEY` for local/cloud Eve runs outside Vercel AI
  Gateway wiring

### Later pipeline product (after idea review)

- [ ] WhatsApp / contact-finding flow for `awaiting_contacts` → interview phases
- [ ] Interview capture → draft writer → draft review
- [ ] **Publish bridge** from pipeline → Keystatic Markdoc → `published`
- [ ] (Deferred) story-angle dedupe against already published articles

---

## Definition of done (Phase 3 ops)

- [ ] Hosted `/keystatic` save creates a Git commit on production
- [ ] Published article goes live via Vercel; draft stays off public indexes
- [ ] Viewer cannot edit; Admin/Journalist can
- [ ] Newsletter unsubscribe path preserves `siteAccess` (tested once)
- [ ] Privacy mailbox matches published contact
- [ ] DPA paperwork tracked (even if not all signed yet)

Phase 4 full live list stays gated on §5 pilot items.
