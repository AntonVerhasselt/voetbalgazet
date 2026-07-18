# Implementation review 3 — post-merge (`master` → fix branch)

**Date:** 17 Jul 2026  
**Branch:** `cursor/fix-review-findings-f684`  
**Merge:** `origin/master` merged at `3e1ba91` (PostHog cookieless phases, tracked homepage links, article share flag, Keystatic serverless tracing, content publish for `jeugdtrainer-met-een-plan`)  
**Scope:** Full re-pass of plans vs code after merge + second-review fixes. No new feature work in this pass — findings only.

**Verdict:** Prior Criticals (C1–C4 opaque tokens, List-Unsubscribe, agent bridge) remain fixed. Master merge introduced **no opaque-token regressions**. Live Gmail/Trooper delivery is **working** after DNS (DMARC `adkim=r; aspf=r` + correct DKIM). Remaining gaps are **Warnings / Info / intentional MVP** — strongest fix candidates: Resend hard-bounce → suppression mapping, Admin-only recovery, kill-switch audit.

---

## A. Merge context

| Incoming from `master` | Interaction with this branch |
|------------------------|------------------------------|
| PostHog cookieless (`persistence: "memory"`, `person_profiles: "never"`) | Compatible; public events still avoid PII/tokens |
| `TrackedArticleLink`, archive search analytics, scroll-depth taxonomy | Additive; no conflict with email bootstrap |
| `ArticleShare` + feature flag | Kept master’s share UI; no duplicate controls |
| Keystatic `outputFileTracingIncludes` | Ops/deploy fix; unrelated to newsletter security |
| Content: `jeugdtrainer-met-een-plan.mdoc` | Merge added missing `publishedAt` so content tests stay green |

Conflict resolutions favored this branch’s security work (opaque DB tokens, `getPublicRequestOrigin`, kill-switch return-null, HomepageSignupBand layout) while adopting master analytics helpers.

Post-merge checks: `npm test` 55 passed; lint/typecheck green.

---

## B. Previously Critical — still fixed

| ID | Finding | Status after merge |
|----|---------|-------------------|
| C1 | Article email links must use opaque bootstrap tokens | **Fixed** — `emailLinkTokens` + `/email/artikel` → `exchangeBootstrapToken` → BA magic-link |
| C2 | Preferences links must be opaque | **Fixed** — purpose `preferences_access`, `/email/voorkeuren` |
| C3 | List-Unsubscribe must not embed email in query | **Fixed** — `/api/email/uitschrijven?token=` + RFC 8058 POST |
| C4 | Agent prepare/event must not be public Convex API | **Fixed** — `internalMutation` + Convex.site Bearer bridge + rate limit |

Second-review regressions also still fixed:

- Kill-switch mid-send: `enqueueRecipientBatch` marks failed and **returns null** (no throw/rollback)
- Tunnel/proxy: `getPublicRequestOrigin()` for email bootstrap + unsubscribe redirects
- E2E helpers: `convex/testOps.ts` (mint/delete) — internal only

---

## C. Delivery / DNS (ops status update)

| Item | Second review | Third review |
|------|---------------|--------------|
| Gmail bounce for owner inbox | Failed at provider (DMARC) | **Resolved** — DMARC relaxed alignment + DKIM corrected; test sends to Gmail + `anton@trooper.be` delivered + opened |
| App send pipeline | OK (sink + Resend accept) | Still OK |
| Launch todo “DMARC instellen” | Unchecked in plan | **Ops done**; plan checkbox in `09-launch-todos.md` still unchecked (doc hygiene) |

`NEWSLETTER_LIVE_SEND` should remain `false` on agent deployment when not actively testing.

---

## D. Findings — Critical

**None.** No open Critical security holes in token handling, public mutation auth boundaries, or agent bridge after re-check.

---

## E. Findings — Warning

### W3-1 — Hard-bounce suppression never matches Resend payloads *(High confidence)*

**Where:** `convex/newsletterDelivery.ts` (~135–139), wired from `convex/resendClient.ts` (`bounce.type` / `bounce.subType`).

**Bug:** `isHardBounce` requires `bounceType.includes("hard")` or subtype includes `"hard"`. Resend’s documented values are `Permanent` / `Temporary` / `Undetermined` (and subtypes like `Suppressed`, `General`) — **not** the string `"hard"`.

**Effect:** Recipient rows still move to `bounced`, but **hard-bounce suppressions and `emailDeliveryStatus: "bounced"` are likely never applied** for real webhooks. Plan requires bounce/complaint suppressions to gate future sends (`07-analytics-compliance-and-operations.md`, launch recovery checks).

**Nuance:** Resend’s `email.bounced` event itself is the permanent-failure signal (soft issues often arrive as `email.delivery_delayed`). Safest MVP mapping: treat `email.bounced` with `type === "Permanent"` (and possibly all `email.bounced`) as hard; never rely on substring `"hard"`.

**Suggested fix:** Map `Permanent` → hard suppression; optionally treat bare `email.bounced` as hard; keep complaints on `email.complained`.

---

### W3-2 — Failed-recipient recovery is Journalist-capable; plan says Admin-only *(High)*

**Where:** `convex/newsletterSend.ts` — `recoverFailedRecipients = editorMutation`  
**Plan:** `01-product-decisions.md` — “Failed-recipient recovery | Alleen Admin…”; `09-launch-todos.md` — “Manual recovery alleen Admin”.

**Effect:** Any `journalist` can requeue failed recipients (up to 200) after suppression check. Functionality is otherwise sound (status gates, suppression re-check, re-enqueue).

**Suggested fix:** Switch to `adminMutation`; keep UI button Admin-gated if role is already filtered in nav.

---

### W3-3 — Marketing kill switch: no reason, no audit row *(High)*

**Where:** `convex/newsletterAdmin.ts` — `setMarketingKillSwitch` only patches `appRuntimeSettings`.  
**Plan:** `07-analytics-compliance-and-operations.md` — wijziging vereist reden en audit.

**Effect:** Toggle is Admin-only (good) and runtime-effective (good), but incident forensics lack who/why beyond `updatedBy` on the settings row, and UI does not collect a reason. No `newsletterAuditEvents` insert.

---

### W3-4 — `admin_send_alert` seeded but never dispatched *(High)*

**Where:** Template definition in `newsletterAdmin.ts`; no send path references `admin_send_alert` on campaign `failed` / `partially_failed`.

**Plan:** Product decisions / cross-component contracts expect admin alerts on send outcomes.

**Effect:** Editors must watch the admin UI / Resend dashboard; no automatic mailbox alert when a campaign fails.

---

### W3-5 — Double `newsletter_article_link_opened` on email article land *(High)*

**Where:**

1. `apps/web/src/app/email/artikel/route.ts` sets **both** `from=email` and `cid` on callback
2. `public-analytics.tsx` fires event when `cid` present (includes `campaign_analytics_id`), strips only `cid`
3. `article-analytics.tsx` fires same event name when `from=email` (no campaign id); does not strip `from`

**Effect:** Inflated open/click attribution for newsletter → article. Master merge did not cause this; bootstrap intentionally preserves both params.

**Suggested fix:** Single owner — prefer `public-analytics` with `cid`; remove `from=email` emitter (or strip `from` after first capture and drop the article-analytics path).

---

### W3-6 — Taxonomy sync never deactivates removed catalog keys *(High)*

**Where:** `convex/taxonomy.ts` — `runTaxonomySync` upserts only; sets `active: true` on updates; no scan for DB rows missing from catalog.

**Plan:** `content-admin/05-taxonomies-and-settings.md` expects deactivate counts in preview/execute.

**Effect:** Stale divisions/teams remain active in Convex preference UI after catalog removal. Preview also lacks deactivate counters. Sync remains CLI/`adminMutation` only (no admin UI) — acceptable for MVP if documented.

---

### W3-7 — Prefs gate can hang on “sessie controleren…” *(High)*

**Where:** `apps/web/src/components/preferences-form.tsx` — `fetch("/api/reader/preferences")` with no timeout / `.catch`; `loading` stays true on hang/reject.

**Effect:** Logged-out or network-failed users see infinite status text instead of magic-link / error CTA. Noted in second review; still open.

---

### W3-8 — `previewAudience` loads full subscribed set into memory *(Medium)*

**Where:** `convex/newsletterCampaigns.ts` — paginates 500-at-a-time into an in-memory array, then filters.

**Effect:** Correct for small/medium lists; at plan scale (tens of thousands+) this query can hit Convex limits / latency. Prepare path is more carefully batched; preview is the weaker sibling.

**Suggested direction:** Count/exclude with indexed streaming or capped preview + “full count async” job (not required for current launch volume).

---

### W3-9 — Retention cron is partial vs plan table *(Medium)*

**Where:** `convex/retention.ts` + daily cron — deletes expired `emailLinkTokens`, delivery events >90d, cancelled campaigns >90d.

**Plan table also lists:** unused draft revisions, test-mail history, abandoned Resend records, unused draft assets, etc.

**Effect:** Partial compliance; not a security hole. Document as intentional MVP slice or extend cron.

---

### W3-10 — Suppressions store raw `normalizedEmail` *(Medium / intentional tradeoff)*

**Where:** `schema.ts` suppressions table.

**Plan compliance note:** Long-term may prefer hashed email for inactive suppressions; MVP keeps email for Resend alignment and support. Privacy copy routes DSR erase to support — no bulk erase mutation yet (also listed as intentional open).

---

## F. Findings — Info

| ID | Finding | Notes |
|----|---------|-------|
| I3-1 | Privacy page omits GBA street address | Plan `05-privacy-and-terms-copy.md` includes “Drukpersstraat 35, 1000 Brussel”; live page only links GBA site |
| I3-2 | Condensed privacy/terms vs full plan drafts | Acceptable MVP if legal review signs off |
| I3-3 | Analytics property gaps | e.g. `access_level` on some article events; email-link unlock vs gate unlock paths may differ |
| I3-4 | Agent Next.js rate limit is process-local | Convex bridge side is durable; edge multi-instance can soft-bypass Next layer only |
| I3-5 | Keystatic GitHub OAuth / hosted smoke | Still open launch todo — ops, not code defect |
| I3-6 | Taxonomy sync has no admin UI | CLI `scripts/sync-taxonomy.mjs` + admin mutation; fine for MVP |
| I3-7 | Launch todo checkboxes lag reality | DMARC, List-Unsubscribe code path done; checkboxes in `09-launch-todos.md` still open |
| I3-8 | Master analytics additions | Homepage click + share + search events align with cookieless contract; no token leakage found |

---

## G. Still open / intentional non-code (unchanged intent)

| Item | Notes |
|------|-------|
| Pagefind full-text search | Archive search is MVP surface |
| Official VV taxonomy import | Human data confirmation |
| Hosted Keystatic GitHub App smoke | Manual ops |
| Vercel Preview ↔ Convex URL pair | Manual Vercel env |
| Full DSR export/erase tooling | Support process; no bulk erase in MVP |
| Provider batching / workpool at 100k | Improved paging; Resend batch API still incremental |
| Dual renderer perfect visual parity | Contract in `emails/README.md`; shared package not fully extracted |

> Open Design asset-copy todos were removed from launch checklists (17 Jul 2026); live tokens live in `apps/web/src/app/globals.css`.

---

## H. Priority order if fixing next

Third-review Warnings W3-1 … W3-9 were addressed on this branch after the review write-up. Remaining work is intentional non-code / launch ops (see §G).

---

## I. Test / E2E residual notes

- Public smoke, prefs bootstrap, unsubscribe confirm, resubscribe, admin agent session: **passed** in second review; not re-run end-to-end in this third pass beyond merge test suite.
- Live send after DNS: **delivered + opened** (Gmail + Trooper).
- Prefer `testOps` internals for controlled retests; do not leave `NEWSLETTER_LIVE_SEND=true` on shared agent deployment.
