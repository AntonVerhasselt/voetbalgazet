# Component 3 — Email Newsletter

> **Refined plan:** This document remains the architectural overview. The detailed source of truth for the visual newsletter admin, Convex data model, audience filtering, sending, delivery, compliance and implementation phases is [`newsletter-admin-dashboard/`](./newsletter-admin-dashboard/).

> **Important refinement:** Convex is the source of truth for campaigns and audiences. The open-source `@react-email/editor` is used for visually composed newsletter campaigns. Security-sensitive transactional emails remain code-based React Email templates, but are still triggered, sent and monitored through the custom Convex + Resend implementation rather than the Resend dashboard.

## Purpose

Send a **weekly email newsletter** to subscribers collected through the public news site. Campaign bodies are composed in the open-source **`@react-email/editor`**, rendered in a locked React Email brand shell and sent via the **Resend Convex component**. Visual style matches De Voetbalgazet brand.

Design copy on the site sets expectation: *"Eén e-mail per week — lokaal voetbal, geen ruis."*

---

## Design reference

Email templates should mirror the newspaper aesthetic within email client constraints:

```
/Users/antonverhasselt/Library/Application Support/Open Design/namespaces/release-stable-intel/data/projects/a132ea15-213e-409f-9e25-e762711453c3
```

| Element | Source |
|---------|--------|
| Logo | `mr9gvna8-image.png` from design folder |
| Colors | `--bg`, `--fg`, `--muted`, `--border` from `brand-spec.md` |
| Headlines | Playfair Display (web font or fallback serif in email) |
| Body | System sans stack |
| Layout | Hairline dividers, minimal color, strong typography hierarchy |
| Tagline | *Lokaal voetbal, echte verhalen* |

**Note:** Email clients limit CSS. Use React Email components with inline-safe styles; paper grain overlay won't translate — keep layout clean instead.

---

## Subscriber audience

**Source:** All email addresses captured via:
- Article email gate (`article-gate.html` flow)
- Homepage inline subscribe band

Stored in Convex `subscribers` table:
- `email` (required, unique)
- `divisionIds[]` — minstens één reeks
- `favoriteTeamId` — optioneel, maximaal één club
- `siteAccess` — staat los van nieuwsbriefstatus
- `newsletterSubscribed`, `newsletterSubscribedAt`, `unsubscribedAt`
- `consentCapturedAt`, `consentVersion`, `consentSource`
- `emailDeliveryStatus`: `unknown | deliverable | bounced`

Convex selects recipients directly. Resend Audiences/contacts are not the source of truth and are not required for campaign sending.

---

## Resend integration

Via [Convex Resend component](https://www.convex.dev/components/resend):

| Capability | Use |
|------------|-----|
| **Transactional** | Welcome/verification, magic link, unsubscribe confirmation |
| **Broadcast / batch** | Weekly newsletter send |
| **React Email** | Template authoring in `emails/` directory |
| **Webhooks** | Delivery, bounce, complaint events → update subscriber status |

### React Email structure (proposed)

```
emails/
├── components/
│   ├── NewsletterEnvelope.tsx # Locked brand/legal shell
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── ArticleCard.tsx
├── transactional/
│   ├── Welcome.tsx
│   ├── MagicLink.tsx
│   └── VerifyEmail.tsx
└── renderer/               # Shared editor extensions + server renderer
```

The visual editor owns only the newsletter body. Transactional templates and the campaign shell remain code-based. Resend receives only server-rendered HTML/text.

---

## Newsletter content model

### Newsletter campaign

Each `newsletterCampaigns` record links to immutable revisions, an audience definition and one live send:

| Field | Description |
|-------|-------------|
| `subject` | Dutch subject line |
| `preheader` | Inbox preview text |
| `status` | `draft | scheduled | needs_review | preparing | sending | sent | partially_failed | failed | cancelled` |
| `scheduledAt` | Send datetime |
| `activeRevisionId`, `sendRevisionId` | Editable and frozen content revisions |
| `audienceDefinitionId` | Preference filters |
| `sentAt`, `recipientCount`, `stats` | Post-send metadata |

### Article card in email
- Division tag (mono label)
- Headline (link to gated article on site)
- Dek / excerpt
- Author + date
- "Lees verder →" CTA

---

## Send workflow

```
┌────────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Admin curates  │────▶│ Preview + approve│────▶│ Schedule/send│
│ issue draft    │     │ (human)          │     │ via Resend   │
└────────────────┘     └─────────────────┘     └──────┬───────┘
                                                      │
                                                      ▼
                                            All active subscribers
                                            (synced from Convex)
```

### Human-in-the-loop
1. Journalist selects published articles for the week (from admin).
2. Optional intro note in Dutch.
3. Preview rendered email (desktop + mobile).
4. Approve send or schedule.
5. Convex freezes recipients and internal workers queue per-recipient delivery through the Resend component.
6. Webhooks update delivery stats.

---

## Segmentation (TBD)

**Default (MVP):** One shared body per campaign, sent to all eligible subscribers or narrowed by explicit division and favorite-team filters.

**Future:** Per-recipient preference-based blocks:
- "Jouw club" — stories matching favourite team
- "Jouw reeks" — stories matching selected divisions
- Requires template sections conditionally rendered per subscriber (Resend batch with merge fields or multiple segments)

Prototype preferences exist for this — product decision needed.

---

## Transactional emails

| Email | Trigger |
|-------|---------|
| **Welcome** | After signup + preferences saved |
| **Welcome + verify** | Na signup; lezen is al onmiddellijk ontgrendeld |
| **Magic link** | Bevestig identiteit/apparaat voor subscriberfuncties |
| **Unsubscribe confirm** | One-click unsubscribe |

All use same brand components (Header/Footer).

---

## Unsubscribe & compliance

Required for Belgian/EU email marketing:

- One-click unsubscribe link in every newsletter (Resend `List-Unsubscribe` header)
- Link zet alleen `newsletterSubscribed = false` en synchroniseert Resend; `siteAccess` blijft actief
- Physical/editorial address in footer (TBD)
- Privacy policy link
- Record consent timestamp and version at signup
- Handle bounces/complaints via Resend webhooks

---

## Admin UI (newsletter section)

Within admin dashboard (Component 2):

| Screen | Function |
|--------|----------|
| **Issues list** | Past and draft newsletters |
| **Issue editor** | Pick articles, write intro, set subject |
| **Preview** | Render React Email template with live data |
| **Send controls** | Test send (to journalist), schedule, send now |
| **Stats** | Opens, clicks (Resend analytics) |

Styling: same De Voetbalgazet admin shell.

---

## Tech stack

| Piece | Choice |
|-------|--------|
| Visual campaign editor | `@react-email/editor` |
| Shell + transactional templates | React Email |
| Send | Resend via Convex component |
| Subscriber audience | Convex subscribers + indexed preference projection |
| Scheduling | Explicit Convex scheduled internal function; no automatic weekly cron |
| Preview | React Email CLI + admin embed |

Docs: [Resend Convex component](https://www.convex.dev/components/resend)

---

## Integration with other components

| Component | Integration |
|-----------|-------------|
| **News site** | Signups feed subscriber list; article URLs bootstrap een 90-dagensessie en openen meteen volledig |
| **Admin** | Article publish → available in issue picker; send approval in dashboard |
| **Convex** | Single source of truth for subscribers + issue state |

---

## MVP checklist

- [ ] React Email locked shell (Header, Footer, ArticleCard)
- [ ] Visual editor with weekly template and 3–5 article slots
- [ ] Welcome email template
- [ ] Convex subscriber eligibility and preference indexes
- [ ] Unsubscribe handler (HTTP action + webhook)
- [ ] Admin: create draft issue + pick articles
- [ ] Preview in browser
- [ ] Test send to single address
- [ ] Manual "Send newsletter" button
- [ ] Explicit scheduling in `Europe/Brussels` (no automatic weekly cron)

---

## Decisions and remaining questions

The refined dossier chooses editorial send-now or explicit scheduling, Convex-managed audiences and no per-recipient content personalization in MVP. Remaining questions, each with a recommended fallback, are maintained in [`newsletter-admin-dashboard/09-open-questions.md`](./newsletter-admin-dashboard/09-open-questions.md).
