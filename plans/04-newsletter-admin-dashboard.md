# Newsletter Admin Dashboard

Implementation plan for the newsletter admin dashboard with visual email composition, audience targeting, and Resend delivery via Convex.

## Status: Implemented (MVP)

The newsletter admin dashboard is the first implemented component of the De Voetbalgazet platform.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Admin Dashboard (Next.js)                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Email List   │  │ Visual Editor│  │ Audience Filters │  │
│  │ drafts/sent  │  │ @react-email │  │ divisions/teams  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │                 │                   │
          └─────────────────┴───────────────────┘
                            │
                    ┌───────▼────────┐
                    │     Convex     │
                    │ newsletterEmails│
                    │ subscribers    │
                    │ divisions/teams│
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │ Resend Component│
                    │ (transactional) │
                    └────────────────┘
```

---

## Visual Email Editor

Uses the open-source **@react-email/editor** (React Email 6.0):

- TipTap/ProseMirror-based WYSIWYG editor
- Bubble menus, slash commands, Inspector sidebar
- Exports email-ready HTML via `getEmailHTML()`
- Content stored as both HTML and TipTap JSON for re-editing

### Editor workflow

1. Create new newsletter → opens editor with default template
2. Compose visually with formatting tools
3. Save draft → stores `editorHtml`, `editorJson`, `renderedHtml` in Convex
4. Preview via test send to any address
5. Send to audience → wraps content in branded template, queues via Resend

---

## Data Model

### `newsletterEmails`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Internal label |
| `subject` | string | Email subject line |
| `preheader` | string? | Inbox preview text |
| `editorHtml` | string | Editor content (HTML) |
| `editorJson` | string? | TipTap JSON for re-editing |
| `renderedHtml` | string? | Final HTML at send time |
| `status` | draft \| sending \| sent \| failed | Lifecycle |
| `audienceFilter` | object? | Targeting criteria |
| `sentAt` | number? | Send timestamp |
| `recipientCount` | number? | Total recipients |
| `duplicatedFromId` | id? | Source if duplicated |

### Audience filter

```typescript
{
  newsletterSubscribedOnly: true,
  divisionIds?: Id<"divisions">[],    // Filter by reeks
  favoriteTeamIds?: Id<"teams">[],    // Filter by favorite club
  matchMode?: "any" | "all",          // OR vs AND for divisions
}
```

### `subscribers`

As defined in public site plan, with preference fields used for targeting.

---

## Features

### Email management

| Feature | Status |
|---------|--------|
| Create draft | ✅ |
| Visual editor (@react-email/editor) | ✅ |
| Save draft (auto HTML + JSON) | ✅ |
| Duplicate email | ✅ |
| Delete draft | ✅ |
| List drafts and sent | ✅ |
| Read-only view for sent emails | ✅ |

### Sending

| Feature | Status |
|---------|--------|
| Test send to single address | ✅ |
| Send to filtered audience | ✅ |
| Audience count preview | ✅ |
| Division-based filtering | ✅ |
| Team-based filtering | ✅ |
| Resend via Convex component | ✅ |
| Send logs per subscriber | ✅ |
| Bounce handling via webhook | ✅ |

### Not yet implemented

| Feature | Notes |
|---------|-------|
| Better Auth for admin | Planned; dashboard currently open |
| Scheduled sends | Convex cron |
| Resend analytics (opens/clicks) | Webhook + stats UI |
| Article picker for digest | Depends on admin article publish |
| Unsubscribe URL generation | Needs public site URL |
| Weekly automation | Editorial trigger preferred |

---

## Admin Routes

| Route | Purpose |
|-------|---------|
| `/admin/newsletter` | List all newsletters (drafts + sent) |
| `/admin/newsletter/[id]` | Visual editor + send controls |
| `/admin/subscribers` | Subscriber list with preferences |

---

## Resend Integration

All email sending goes through the **Convex Resend component** — never the Resend dashboard:

```typescript
// convex/lib/resendClient.ts
export const resend = new Resend(components.resend, {
  onEmailEvent: internal.subscribers.handleEmailEvent,
  testMode: true, // Set false in production
});
```

### Send flow

1. Admin clicks "Verstuur naar publiek"
2. `emailSending.sendToAudience` mutation filters subscribers
3. Email status → `sending`
4. `emailSendingActions.sendBatch` internal action queues individual sends
5. Each send via `resend.sendEmail()` with branded wrapper
6. Status → `sent` with recipient/delivery counts
7. Webhooks update bounce status on subscribers

### Environment variables

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key (Convex env) |
| `RESEND_FROM_ADDRESS` | Sender address |
| `RESEND_WEBHOOK_SECRET` | Webhook verification |
| `NEXT_PUBLIC_CONVEX_URL` | Frontend Convex connection |

---

## Development

```bash
# Install dependencies
npm install

# Start Convex (from repo root)
npm run convex:dev

# Start Next.js admin (separate terminal)
npm run dev
```

Seed demo data via "Demo data laden" button on newsletter list page.

---

## MVP Checklist (updated)

- [x] React Email visual editor integration
- [x] Save drafts with HTML + JSON content
- [x] Duplicate emails
- [x] List drafts and sent newsletters
- [x] Audience filtering by division and team preferences
- [x] Test send to single address
- [x] Send to filtered audience via Resend component
- [x] Subscriber management view
- [x] Bounce handling via Resend webhooks
- [ ] Admin authentication (Better Auth)
- [ ] Branded email wrapper with logo
- [ ] Unsubscribe link with one-click handler
- [ ] Send scheduling
- [ ] Open/click analytics
- [ ] Article picker for weekly digest

---

## Open questions (resolved / updated)

1. **Send trigger:** Editorial discretion (manual send button) — not fixed schedule for MVP.
2. **Personalization:** Audience filtering by preferences at send time, not per-subscriber content blocks.
3. **Editor vs templates:** Visual editor for free-form composition; article-based digest templates can be added later.
4. **Resend audience:** Not using Resend audiences/contacts — subscriber list managed entirely in Convex.
5. **Editor sign-off:** Single admin user for MVP; multi-user approval later.
