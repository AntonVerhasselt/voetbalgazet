# Open todos — De Voetbalgazet

Single checklist for remaining work. Product/architecture plans are complete and
removed; items below are manual ops, launch checks, and known non-code gaps.

Canonical rules (do not change):

- `siteAccess` and `newsletterSubscribed` are separate.
- `/uitschrijven` is newsletter-only; it never revokes website article access.
- Soft gate remains soft (technical bypass possible); that is intentional.

---

## 1. Vercel / Convex preview

- [ ] **Vercel Preview Convex URLs** — Settings → Environment Variables →
  Preview: set **both** (non-regional production hosts unless you intentionally
  use a separate preview Convex deployment):

  ```text
  NEXT_PUBLIC_CONVEX_URL=https://calculating-eel-615.convex.cloud
  NEXT_PUBLIC_CONVEX_SITE_URL=https://calculating-eel-615.convex.site
  ```

  Redeploy a preview. Confirm `/api/auth/sign-in/social` on the preview host
  returns GitHub OAuth JSON (not 502 with a bad `proxyTarget`).

  See [`docs/vercel-deploy.md`](./docs/vercel-deploy.md) and
  [`docs/admin-auth.md`](./docs/admin-auth.md).

---

## 2. Hosted Keystatic (production editing)

Prerequisites (confirm once): production apex `https://devoetbalgazet.be`,
Vercel root `apps/web`, Convex production deploy key, Better Auth secrets,
Keystatic env vars already set for Preview + Production
(`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`,
`KEYSTATIC_SECRET`, `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`).

### GitHub App

- [ ] Create/configure the Keystatic GitHub App (repo-scoped to
  `AntonVerhasselt/voetbalgazet`)
- [ ] Homepage `https://devoetbalgazet.be`; callback
  `https://devoetbalgazet.be/api/keystatic/github/oauth/callback`
- [ ] Permissions: Contents R/W; Metadata read; optionally PRs R/W
- [ ] Confirm Vercel secrets match Client ID / secret / app slug; redeploy after changes

Details: [`docs/keystatic-admin.md`](./docs/keystatic-admin.md).

### Smoke publish

- [ ] Sign in as Admin/Journalist → `/keystatic` → GitHub App authorize
- [ ] Save a draft → commit appears on expected branch
- [ ] Publish → Vercel build → article live on `/nieuws/<slug>`; draft off sitemap/RSS
- [ ] Viewer cannot open `/keystatic` (redirect/403); Admin/Journalist can

### Optional draft-branch preview

- [ ] `KEYSTATIC_GITHUB_READER_TOKEN` + `KEYSTATIC_PREVIEW_BRANCH_PREFIXES`
- [ ] Preview from Keystatic is `noindex`, uncached, editor-session gated

### Content admin polish

- [ ] Mobile a11y smoke on `/admin` and `/keystatic` (320–390 px, 44 px targets, keyboard)
- [ ] Keystatic list/edit + virtual keyboard / sticky controls on small screens
- [ ] Publish confirm usable on mobile; status not color-only
- [ ] Mobile Core Web Vitals on published articles

---

## 3. Public site — auth, email, SEO

### Auth / signup (production)

- [ ] New email via gate → preferences → subscribe; magic-link arrives (Resend)
- [ ] Click link → verified session; `/voorkeuren` works
- [ ] Returning email continues without preference overwrite
- [ ] Rapid signup attempts get rate-limited

### Newsletter unsubscribe (product check)

- [ ] Mint production unsubscribe token (`createUnsubscribeToken` /
  `BETTER_AUTH_SECRET` matching production Convex)
- [ ] `/uitschrijven?token=` → nieuwsbrief-only copy; confirm →
  `newsletterSubscribed === false`, `siteAccess` still true
- [ ] Gated article still readable; `/voorkeuren` shows resubscribe CTA

### E-mail and access

- [ ] Welkomst-/verificationmail juridisch en redactioneel nalezen
- [ ] Newsletter bootstrap-token op 30 dagen configureren
- [ ] Bounce- en complaintflow testen
- [ ] Rate limiting en generieke e-mailresponses testen

### SEO / social / quality

- [ ] OG share check (homepage + article with/without hero)
- [ ] Mobile-first flows op 320, 360, 390 en 768 px
- [ ] Gate/keyboard/safe-area op echte iOS- en Androidtoestellen
- [ ] Homepage, artikel en archieffilters zonder hover/desktop-only acties
- [ ] Rich Results Test voor gated en vrije artikels
- [ ] Search Console en eventuele Google News-publicatie
- [ ] Sitemap, robots en excerpt-RSS valideren
- [ ] Accessibility- en keyboardtest van gate en voorkeuren
- [ ] Core Web Vitals en gate-layoutshift testen

### Content / taxonomy

- [ ] Officiële Voetbal Vlaanderen-bron en toegestane gebruikswijze bepalen
- [ ] Club- en reekstaxonomie importeren (YAML + Convex catalog blijven in sync via tests)
- [ ] Bevestigen: geen standen, wedstrijdwidgets of clubpagina's uit VV-data in publieke MVP
- [ ] Definitieve categorie-ID's/slugs vastleggen
- [ ] Redactioneel beleid voor `isGated: false` vastleggen

---

## 4. Legal / privacy / ops

- [ ] Mailbox/alias voor `privacy@devoetbalgazet.be` bevestigen (of
  `PRIVACY_EMAIL` in `apps/web/src/lib/site-config.ts` wijzigen)
- [ ] Privacy-/supportcontact en voorwaarden-URL's definitief bevestigen
- [ ] Verantwoordelijke uitgever vermelden waar juridisch vereist
- [ ] Definitieve juridische entiteiten, regio's en subverwerkers van Convex,
  Vercel, Resend, PostHog en R2 controleren
- [ ] Verwerkersovereenkomsten/DPA's afsluiten
- [ ] Internationale doorgiftegronden documenteren
- [ ] Retentie technisch instellen: security/errorlogs 90 dagen, analytics 24
  maanden, support 24 maanden
- [ ] Supportprocedure voor inzage, correctie en volledige verwijdering testen
- [ ] Consentcopy en consentversie exact gelijk maken aan live formulier
- [ ] Cookiegedrag: niet-noodzakelijke tracking pas na geldige keuze
- [ ] Belgische juridische review van gecombineerde siteAccess + initiële
  nieuwsbriefinschrijving (aanbevolen; geen technische blocker)

---

## 5. Newsletter admin — launch

Provider setup (Resend, R2, PostHog, DNS) is done. Remaining before full live list:

### Footer / legal

- [ ] Vaste campagnefooter (`Uitschrijven` / `Voorkeuren aanpassen`) juridisch/copy nalezen
- [ ] Footer/legal placeholders volledig verwijderd vóór production sends

### Deliverability

- [ ] DMARC instellen en rapportage opvolgen
- [ ] Open- en clicktracking activeren
- [ ] Opens in admin als indicatief labelen
- [ ] `List-Unsubscribe` en RFC 8058 `List-Unsubscribe-Post` testen
- [ ] Gmail, Outlook en Apple Mail inbox-/spamtests

### R2 / e-mailbeelden

- [ ] CORS beperken tot development, staging en production admin origins
- [ ] Cacheheaders voor e-mailbeelden controleren
- [ ] JPEG, PNG, WebP en GIF testen; limiet 5 MB afdwingen
- [ ] Animated-GIF size/clientwaarschuwing
- [ ] Verifiëren dat sent-email assets niet door cleanup worden verwijderd

### Roles / alerts

- [ ] Eerste Admin-, Journalist- en (indien nodig) Vieweraccounts bepalen
- [ ] Alleen Admin kan transactionele e-mails wijzigen/testen/publiceren/uitschakelen/terugrollen
- [ ] Interne testmailadressen configureren
- [ ] Failure alerts naar Admins + initiërende Journalist; dedupe als initiator Admin is

### Transactionele templates (per type)

Types: Welcome, Magic link, Verify email, Preferences changed, Unsubscribe
confirmed (indien gewenst), Admin send alert.

- [ ] Allowed/required systeemvariabelen vastleggen
- [ ] Visuele inhoud in admin; preview met dummydata
- [ ] Succesvolle testmail; eerste actieve versie als Admin publiceren
- [ ] Triggerflow end-to-end zonder echte tokens in logs/UI

### Privacy / retentie (newsletter)

- [ ] Privacyverklaring actualiseren voor open-, click- en deliverystatus
- [ ] Open tracking / providerlinktracking juridisch bevestigen
- [ ] Campagnecontent als redactioneel archief documenteren (geen auto-expiry)
- [ ] Recipientmapping / campagneaggregaten / audit events: 24 maanden
- [ ] Deliveryevents 90d; Resend finalized 30d; abandoned 90d; testmailhistoriek 90d
- [ ] Ongebruikte draftrevisies/assets na 90d + referentiecheck opruimen
- [ ] R2-assets in verzonden e-mail bewaren zolang campagne-archief blijft
- [ ] Suppressions bewaren zolang nodig; subscriber deletion/pseudonymization E2E

### Audience / sending / recovery

- [ ] `subscriberDivisionPreferences` projectie + dry-run vóór writes
- [ ] OR-binnen / AND-tussen filters; clubfilter zonder favoriet; unverified single-opt-in eligible
- [ ] Default “Alle actieve abonnees” vereist expliciete confirm
- [ ] Scheduled snapshot gebruikt actuele recipients; countverschil in audit, stopt send niet
- [ ] Loadtest ≥ 100.000 subscribers; Convex/Resend quota check
- [ ] Production environment guard; marketing kill switch; dubbelklik/idempotency
- [ ] Resend outage/retry; schedule in `Europe/Brussels` + DST; cancel / send-now
- [ ] Manual recovery alleen Admin; alleen bij definitieve app-level failure
- [ ] Bounce/complaint/unsubscribe nooit retryen; onzekere status blokkeert recovery;
  suppression opnieuw checken vóór recovery

### Pilot

- [ ] Newsletteradmin op 320/360/390/768 px; editor + virtueel keyboard
- [ ] E-mail preview 320/375 px + echte inboxclients; footerlinks ≥ 44 px
- [ ] HTML-grootte / Gmail clipping
- [ ] Interne production-smoketest; kleine echte pilot
- [ ] Delivery/bounce/complaint/open/click controleren
- [ ] Uitschrijf- en voorkeurenlinks uit echte inbox
- [ ] Alerts en runbooks; daarna pas volledige actieve lijst

Ops notes: [`docs/phase-4-newsletter.md`](./docs/phase-4-newsletter.md).
Keep `NEWSLETTER_LIVE_SEND=false` on agent deployments when not testing.

---

## 6. Agent access (ops)

Code path is shipped. Remaining environment checks:

- [ ] Real Convex dev deployment available to agents (not anonymous-only) for admin sessions
- [ ] `AGENT_ACCESS_SECRET` als Cursor Runtime Secret; Next.js leest hem bij `npm run dev:web`
- [ ] Smoke: `/admin/agent-inloggen` → `/admin` as admin
- [ ] Leave `AGENT_ACCESS_SECRET` unset on production Vercel
- [ ] Document that agent session alone does not complete hosted GitHub Keystatic saves

See [`docs/admin-auth.md`](./docs/admin-auth.md) and [`docs/cloud-agent-auth.md`](./docs/cloud-agent-auth.md).

---

## 7. Known non-code / later gaps

- [ ] Pagefind (or similar) full-text archive search beyond MVP surface
- [ ] Full DSR export/erase tooling (privacy copy points to support process)
- [ ] Provider batching / workpool at 100k scale (paging improved; Resend batch API incremental)
- [ ] Dual renderer perfect visual parity (shared `@devoetbalgazet/emails`; TipTap editor still compatible)

---

## Definition of done (Phase 3 ops)

Treat Phase 3 ops as done when:

- [ ] Hosted `/keystatic` save creates a Git commit on production
- [ ] Published article goes live via Vercel; draft stays off public indexes
- [ ] Viewer cannot edit; Admin/Journalist can
- [ ] Newsletter unsubscribe path preserves `siteAccess` (tested once)
- [ ] Privacy/publisher copy matches real contact channels
- [ ] DPA paperwork tracked (even if not all signed yet)

Phase 4 (full live list) stays gated on §5 pilot items.
