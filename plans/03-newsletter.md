# Component 3 — Email Newsletter

## Purpose

Send a **weekly email newsletter** to all subscribers collected through the public news site. Emails are built with the **Resend React Email** builder and sent via the **Resend Convex component**. Visual style matches De Voetbalgazet brand.

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
- Standalone subscribe page (if added)

Stored in Convex `subscribers` table:
- `email` (required, unique)
- `preferences.divisions[]` — e.g. `"Oost-Vlaanderen::P3-B"`
- `preferences.teams[]` — e.g. `{ name, province }`
- `subscribedAt`, `consentVersion`
- `resendContactId` (sync with Resend audience)
- `status`: `active | unsubscribed | bounced`

---

## Resend integration

Via [Convex Resend component](https://www.convex.dev/components/resend):

| Capability | Use |
|------------|-----|
| **Transactional** | Welcome email, magic link, double opt-in confirmation |
| **Broadcast / batch** | Weekly newsletter send |
| **React Email** | Template authoring in `emails/` directory |
| **Webhooks** | Delivery, bounce, complaint events → update subscriber status |

### React Email structure (proposed)

```
emails/
├── components/
│   ├── Header.tsx          # Logo + masthead rules
│   ├── Footer.tsx          # Unsubscribe, tagline, address
│   ├── ArticleCard.tsx     # Headline, dek, link, division tag
│   └── Divider.tsx         # Hairline rule
├── WeeklyDigest.tsx        # Main newsletter template
├── Welcome.tsx             # Post-signup welcome
└── MagicLink.tsx           # Reader login
```

Build/preview with React Email dev server; Resend sends rendered HTML.

---

## Newsletter content model

### Weekly digest issue

Each `newsletterIssues` record:

| Field | Description |
|-------|-------------|
| `subject` | Dutch subject line |
| `preheader` | Inbox preview text |
| `status` | `draft | scheduled | sending | sent` |
| `scheduledAt` | Send datetime |
| `articles[]` | Ordered list of article ids |
| `introHtml` | Optional editor's note (human-written) |
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
5. Convex action triggers Resend broadcast.
6. Webhooks update delivery stats.

---

## Segmentation (TBD)

**Default (MVP):** Same digest to all active subscribers.

**Future:** Preference-based blocks:
- "Jouw club" — stories matching favourite team
- "Jouw reeks" — stories matching selected divisions
- Requires template sections conditionally rendered per subscriber (Resend batch with merge fields or multiple segments)

Prototype preferences exist for this — product decision needed.

---

## Transactional emails

| Email | Trigger |
|-------|---------|
| **Welcome** | After signup + preferences saved |
| **Confirm subscription** | If double opt-in enabled |
| **Magic link** | Returning reader login |
| **Unsubscribe confirm** | One-click unsubscribe |

All use same brand components (Header/Footer).

---

## Unsubscribe & compliance

Required for Belgian/EU email marketing:

- One-click unsubscribe link in every newsletter (Resend `List-Unsubscribe` header)
- Link updates Convex `subscribers.status` + Resend audience
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
| Templates | React Email (`@react-email/components`) |
| Send | Resend via Convex component |
| Subscriber sync | Convex mutation on signup → create/update Resend contact |
| Scheduling | Convex cron or scheduled function for weekly send |
| Preview | React Email CLI + admin embed |

Docs: [Resend Convex component](https://www.convex.dev/components/resend)

---

## Integration with other components

| Component | Integration |
|-----------|-------------|
| **News site** | Signups feed subscriber list; article URLs in email point to gated pages (subscribers already have access) |
| **Admin** | Article publish → available in issue picker; send approval in dashboard |
| **Convex** | Single source of truth for subscribers + issue state |

---

## MVP checklist

- [ ] React Email base layout (Header, Footer, ArticleCard)
- [ ] `WeeklyDigest` template with 3–5 article slots
- [ ] Welcome email template
- [ ] Convex subscriber → Resend sync on signup
- [ ] Unsubscribe handler (HTTP action + webhook)
- [ ] Admin: create draft issue + pick articles
- [ ] Preview in browser
- [ ] Test send to single address
- [ ] Manual "Send newsletter" button
- [ ] (Later) Scheduled weekly cron

---

## Open questions

1. Double opt-in before adding to newsletter list?
2. Send day/time fixed (e.g. Thursday 7:00) or editorial discretion?
3. Personalization in MVP or single blast for all?
4. Include non-gated teaser content in email vs. full excerpts?
5. Resend audience vs. raw email list — one audience or segmented lists per province?
6. Editor's name/sign-off in newsletter?
