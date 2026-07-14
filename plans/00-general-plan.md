# General Plan — De Voetbalgazet

## Vision

De Voetbalgazet is a Flemish local football news platform that combines:

1. A **beautiful, static, newspaper-style public site** where every article is free to discover but requires email subscription to read in full.
2. An **AI-assisted editorial backend** that helps journalists find stories, conduct interviews, and draft articles — with humans approving every step.
3. A **weekly email newsletter** that delivers the best stories to subscribers, styled consistently with the brand.

All user-facing copy is **Dutch (Flanders)**.

---

## Architecture overview

### Deployment topology

```
                    ┌──────────────┐
                    │   Vercel     │
                    │  Next.js app │
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    Static pages      Admin routes      API routes
    (SSG/ISR)         (SSR, auth)       (webhooks)
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌──────▼───────┐
                    │    Convex    │
                    │  (backend)   │
                    └──────┬───────┘
                           │
    ┌──────────┬───────────┼───────────┬──────────┐
    │          │           │           │          │
 Better    Resend        R2        Agent      PostHog
 Auth      (email)    (media)   (workflows)  (opt.)
    │          │           │           │
    └──────────┴───────────┴───────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
          OpenRouter    OpenAI       Twilio
          (LLM tasks)  (Realtime)  (WhatsApp/voice)
```

### Repository structure (proposed)

```
voetbalgazet/
├── plans/                    # This folder
├── apps/
│   └── web/                  # Next.js (public + admin + newsletter preview)
├── convex/                   # Backend functions, schema, agents
│   ├── schema.ts
│   ├── subscribers.ts
│   ├── articles.ts
│   ├── newsletter.ts
│   ├── agents/               # Journalist workflow agents
│   └── components/           # Convex component configs
├── emails/                   # Shared editor renderer, variables and locked compliancefooter
├── content/                  # MDX/markdown for static articles (optional)
└── design/                   # Symlink or copy of Open Design assets
```

---

## Design system

**Source of truth:** Open Design prototype folder (see [README](./README.md#design-reference)).

When implementing:

- Port CSS custom properties from `styles.css` into Tailwind theme or CSS modules.
- Reuse masthead, rules, typography scale, gate sheet, and preference picker patterns.
- Offer the same tokens as editor defaults (adapted for email client constraints), without forcing a fixed newsletter template.
- Logo and assets live in the design folder (`mr9gvna8-image.png`).

---

## Data model (initial sketch)

Convex tables to define during refinement:

| Table | Purpose |
|-------|---------|
| `subscribers` | Email, preferences (divisions, teams), consent timestamps and delivery eligibility; Convex is source of truth |
| `users` | Admin/journalist accounts (Better Auth) |
| `articles` | Draft/published metadata, slug, gate status, MDX/content ref, publish date |
| `articleContent` | Full body (or R2 ref for long content) |
| `teams` | Club catalog synced from football data source |
| `divisions` | Province + reeks structure |
| `storyIdeas` | AI-generated pitches with scores and source context |
| `interviewRequests` | WhatsApp outreach state, contact info |
| `interviews` | Recordings, transcripts, voice session metadata |
| `agentRuns` | Step-by-step workflow state for human review |
| `newsletterCampaigns` | Visual drafts, revisions, audience definitions, immutable sends and aggregate stats |
| `newsletterRecipients` | Bevroren ontvangers en app-level deliverystatus per send |
| `media` | R2 file references (images, audio) |

Indexes: by email, by slug, by publish status, by subscriber preferences for newsletter segmentation.

---

## Authentication & access

| Audience | Mechanism |
|----------|-----------|
| **Subscribers (readers)** | Better Auth anonymous reader-session for immediate access; verified identity via magic/newsletter link; 90-day HttpOnly cookie |
| **Admin (journalists)** | Better Auth — email/password or OAuth; role-based access to dashboard |
| **Webhooks** | Twilio, Resend, Vercel deploy hooks — signed secrets |

Article gate flow (from design):

1. User hits gated article → public lead-in + mandatory bottom sheet.
2. Enter email; a new subscriber selects at least one division and optionally one team.
3. “Abonneer en lees verder” sets separate `siteAccess` and `newsletterSubscribed` flags.
4. Better Auth anonymous reader-session unlocks immediately with a 90-day HttpOnly cookie.
5. Returning users on the same device auto-authenticate.
6. Existing email on a new device receives immediate reader access, but identity is only verified by magic/newsletter link.

**Session storage:** HttpOnly `Secure` `SameSite=Lax` cookies via Better Auth — **not** localStorage (XSS risk). See [public news site auth plan](./public-news-site/02-access-and-auth.md).

---

## Cross-component integrations

| From → To | Integration |
|-----------|-------------|
| Admin → News site | Publish triggers static rebuild; article JSON/MDX exported or fetched at build |
| Admin → Newsletter | Separate admin navigation only; emailcontent is manually created in the visual editor |
| News site → Convex | Signup, preferences, gate verification |
| News site → Resend | Welcome/verification link; single opt-in newsletter |
| Admin agents → Twilio | WhatsApp messages to schedule interviews |
| Admin agents → OpenAI | Realtime voice sessions for phone interviews |
| Admin agents → OpenRouter | Analysis, ideation, drafting |
| Newsletter → Resend | Batch send to subscriber list |
| All → R2 | Article images, interview audio, generated assets |

---

## Phasing (proposed)

### Phase 1 — Foundation
- Next.js project + Convex setup
- Better Auth for admin
- Design system port from Open Design
- Subscriber schema + basic signup API
- Static homepage + one sample article

### Phase 2 — Public site
- Full static article pipeline
- Email gate + preference picker (real team/division data)
- Better Auth anonymous + verified sessions (90-day HttpOnly cookie)
- Immediate reader access + welcome/newsletter bootstrap links
- Paywall structured data, sitemap and excerpt RSS

### Phase 3 — Admin MVP
- Article CRUD with human editor
- Manual publish to static site
- Basic dashboard shell matching brand

### Phase 4 — AI journalist flows
- Football data ingestion (standings, results, calendar)
- Story ideation agent + review UI
- WhatsApp outreach agent
- Voice interview agent
- Writing agent + editorial review

### Phase 5 — Newsletter
- Open-source React Email visual editor in admin
- Free-form React Email editor for campaigns and transactional emails; only newsletter campaigns append a locked footer with unsubscribe, preference management and legal/contact information
- Convex-managed audience filtering by subscriber preferences
- Test, send-now and explicit scheduling via Resend component
- Delivery webhooks, suppressions and results

Detailed source of truth: [`newsletter-admin-dashboard/`](./newsletter-admin-dashboard/).

---

## Non-functional requirements

| Concern | Approach |
|---------|----------|
| **Performance** | Static pages on CDN; minimal client JS on public site |
| **Privacy (GDPR)** | Consent at signup, unsubscribe + preference management in every campaign, data export/delete |
| **Reliability** | Convex reactivity for admin; idempotent webhook handlers |
| **Cost control** | OpenRouter model selection per task; rate limits on agents |
| **Observability** | Convex logs + optional PostHog for site analytics |

---

## Documentation links

- [Convex](https://docs.convex.dev/)
- [Better Auth (Convex)](https://www.convex.dev/components/better-auth)
- [Cloudflare R2 (Convex)](https://www.convex.dev/components/cloudflare-r2)
- [Resend (Convex)](https://www.convex.dev/components/resend)
- [Agent (Convex)](https://www.convex.dev/components/agent)
- [PostHog (Convex)](https://www.convex.dev/components/posthog/convex)
- [Vercel](https://vercel.com/)
- [Twilio](https://www.twilio.com/docs)
- [OpenAI Realtime](https://developers.openai.com/api/docs/guides/realtime)
- [OpenRouter](https://openrouter.ai/docs/quickstart)

---

## Next refinement topics

1. Confirm football data source and sync strategy.
2. Decide static content strategy (MDX in repo vs. Convex-generated at build).
3. Define MVP scope for admin AI flows (which agent first?).
4. Newsletter segmentation rules (all subscribers vs. preference-filtered).
5. Belgian legal review of combined site access + required initial newsletter opt-in.
