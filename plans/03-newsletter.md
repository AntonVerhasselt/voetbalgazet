# Component 3 — Email Newsletter

> **Refined plan:** This document remains the architectural overview. The detailed source of truth for the visual newsletter admin, Convex data model, audience filtering, sending, delivery, compliance and implementation phases is [`newsletter-admin-dashboard/`](./newsletter-admin-dashboard/).

> **Important refinement:** Convex is the source of truth for campaigns, transactionele editorversies and audiences. The open-source `@react-email/editor` is used for all custom email content. There are no fixed templates or article integrations in MVP; only newsletter campaigns receive an uneditable footer with unsubscribe, preference management and required legal/contact information.

## Purpose

Send a custom editorial newsletter—normally about once per week—to subscribers collected through the public news site. Timing is always Send nu or explicitly scheduled; there is no automatic weekly cron. Every email is composed from scratch or duplicated in **`@react-email/editor`** and sent via the **Resend Convex component**.

Design copy on the site sets expectation: *"Eén e-mail per week — lokaal voetbal, geen ruis."*

---

## Design reference

The editor may expose the newspaper aesthetic as optional defaults within email client constraints; every email remains custom:

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

Mobile-first rendering and acceptance rules: [`ui-ux/`](./ui-ux/).

---

## Subscriber audience

**Source:** All email addresses captured via:
- Article email gate (`article-gate.html` flow)
- Homepage inline subscribe band

Stored in Convex `subscribers` table:
- `normalizedEmail` (required, unique index)
- `divisionIds[]` — minstens één reeks
- `favoriteTeamId` — optioneel, maximaal één club
- `siteAccess` — staat los van nieuwsbriefstatus
- `newsletterSubscribed`, `newsletterSubscribedAt`, `unsubscribedAt`
- `consentCapturedAt`, `consentVersion`, `consentSource`
- `emailDeliveryStatus`: `unknown | deliverable | bounced`
- active Convex suppressions for unsubscribe, hard bounce, complaint or manual block

Convex selects recipients directly. Resend Audiences/contacts are not the source of truth and are not required for campaign sending.

---

## Resend integration

Via [Convex Resend component](https://www.convex.dev/components/resend):

| Capability | Use |
|------------|-----|
| **Transactional** | Welcome/verification, magic link, unsubscribe confirmation |
| **Broadcast / batch** | Explicit custom campaign send |
| **React Email editor** | Free-form campaign and transactional content |
| **Webhooks** | Delivery, bounce, complaint events → update subscriber status |

### React Email structure (proposed)

```
emails/
├── ComplianceFooter.tsx    # Only locked visual section
├── variables.ts            # Typed transactional system variables
└── renderer/               # Shared editor + server renderer
```

The visual editor owns all custom content. Newsletter preview/serverrendering append the locked compliancefooter. Transactionele e-mails are edited in admin and published as versioned editor documents with required typed variables, without a newsletter-unsubscribefooter.

---

## Newsletter content model

### Newsletter campaign

Each `newsletterCampaigns` record links to immutable revisions, an audience definition and one live send:

| Field | Description |
|-------|-------------|
| `subject` | Dutch subject line |
| `preheader` | Inbox preview text |
| `status` | `draft | scheduled | preparing | sending | sent | partially_failed | failed | cancelled` |
| `scheduledFor` | Send datetime |
| `activeRevisionId`, `sendRevisionId` | Editable and frozen content revisions |
| `audienceDefinitionId` | Preference filters |
| `sentAt`, `recipientCount`, `stats` | Post-send metadata |

There is no ArticleCard or article count in MVP. Text, links, buttons, images and layout are created manually.

---

## Send workflow

```
┌────────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Admin builds   │────▶│ Preview + approve│────▶│ Schedule/send│
│ custom email   │     │ (human)          │     │ via Resend   │
└────────────────┘     └─────────────────┘     └──────┬───────┘
                                                      │
                                                      ▼
                                            Explicitly confirmed audience
                                            (all active or filtered)
```

### Human-in-the-loop
1. Journalist creates a blank email or duplicates an earlier email.
2. Journalist builds all content manually in the visual editor.
3. Preview rendered email (desktop + mobile).
4. Successful testmail on the exact revision.
5. Approve send or schedule.
6. Convex freezes recipients immediately for Send nu or at the actual scheduled send moment, then queues per-recipient delivery through the Resend component.
7. Webhooks update delivery stats.

---

## Segmentation (confirmed)

**Default (MVP):** One shared body per campaign, sent to all eligible subscribers or narrowed by explicit division and favorite-team filters.

Per-recipient content blocks are not in MVP; preferences only narrow the audience.

---

## Transactional emails

| Email | Trigger |
|-------|---------|
| **Welcome** | After signup + preferences saved |
| **Welcome + verify** | Na signup; lezen is al onmiddellijk ontgrendeld |
| **Magic link** | Bevestig identiteit/apparaat voor subscriberfuncties |
| **Unsubscribe confirm** | One-click unsubscribe |

All are visually editable and versioned in admin. Required security variables are typed and validated. They do not receive the marketing-newsletter unsubscribefooter.

---

## Unsubscribe & compliance

Required for Belgian/EU email marketing:

- One-click unsubscribe link in every newsletter (Resend `List-Unsubscribe` header)
- Locked `Voorkeuren aanpassen` link in every campaign footer
- Link zet alleen `newsletterSubscribed = false` en activeert Convex suppression; `siteAccess` blijft actief
- Physical/editorial address in footer (YARU DAKEN BV, Van Duyststraat 60, 2100 Antwerpen — final legal review in [`newsletter-admin-dashboard/09-launch-todos.md`](./newsletter-admin-dashboard/09-launch-todos.md))
- Privacy policy link
- Record consent timestamp and version at signup
- Handle bounces/complaints via Resend webhooks

---

## Admin UI (newsletter section)

Within admin dashboard (Component 2):

| Screen | Function |
|--------|----------|
| **Campaign list** | Past and draft newsletters |
| **Visual editor** | Build every email freely; no template/article picker |
| **Preview** | Render editor output with locked footer |
| **Send controls** | Test send to explicit internal addresses, schedule, send now |
| **Stats** | Opens, clicks (Resend analytics) |

Styling: same De Voetbalgazet admin shell. Mobile-first layouts and tap targets follow [`ui-ux/`](./ui-ux/).

---

## Tech stack

| Piece | Choice |
|-------|--------|
| Visual campaign editor | `@react-email/editor` |
| Fixed section | Footer with unsubscribe, preferences and required legal/contact links |
| Transactional content | Versioned visual editor documents with typed variables |
| Send | Resend via Convex component |
| Subscriber audience | Convex subscribers + indexed preference projection |
| Scheduling | Explicit Convex scheduled internal function; no automatic weekly cron |
| Preview | Shared `composeReactEmail` renderer in admin + server-side parity |

Docs: [Resend Convex component](https://www.convex.dev/components/resend)

---

## Integration with other components

| Component | Integration |
|-----------|-------------|
| **News site** | Signups feed subscriber list; article token is 30 dagen geldig en kan na exchange een 90-dagensessie maken |
| **Admin** | Separate newsletter editor; no automatic article handoff |
| **Convex** | Single source of truth for subscribers, campaigns, transactional versions and send state |

---

## MVP checklist

- [ ] Free-form React Email editor with locked unsubscribe + preferences footer
- [ ] R2 image upload via `onUploadImage` and permanent CDN URLs
- [ ] Visually editable/versioned welcome, magic-link and verification emails
- [ ] Convex subscriber eligibility and preference indexes
- [ ] Unsubscribe handler (HTTP action + webhook)
- [ ] Admin: create blank campaign or duplicate an earlier campaign
- [ ] Preview in browser
- [ ] Test send to single address
- [ ] Manual "Send newsletter" button
- [ ] Explicit scheduling in `Europe/Brussels` (no automatic weekly cron)

---

## Decisions and launch preparation

All MVP product and architecture decisions are resolved in [`newsletter-admin-dashboard/`](./newsletter-admin-dashboard/). Remaining company data, provider/DNS setup and operational checks are tracked in [`newsletter-admin-dashboard/09-launch-todos.md`](./newsletter-admin-dashboard/09-launch-todos.md).
