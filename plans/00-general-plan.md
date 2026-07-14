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
├── emails/                   # Resend React Email templates
├── content/                  # MDX/markdown for static articles (optional)
└── design/                   # Symlink or copy of Open Design assets
```

---

## Design system

**Source of truth:** Open Design prototype folder (see [README](./README.md#design-reference)).

When implementing:

- Port CSS custom properties from `styles.css` into Tailwind theme or CSS modules.
- Reuse masthead, rules, typography scale, gate sheet, and preference picker patterns.
- Apply the same tokens to admin dashboard and email templates (adapted for email client constraints).
- Logo and assets live in the design folder (`mr9gvna8-image.png`).

---

## Data model (initial sketch)

Convex tables to define during refinement:

| Table | Purpose |
|-------|---------|
| `subscribers` | Email, preferences (divisions, teams), consent timestamps, Resend contact id |
| `users` | Admin/journalist accounts (Better Auth) |
| `articles` | Draft/published metadata, slug, gate status, MDX/content ref, publish date |
| `articleContent` | Full body (or R2 ref for long content) |
| `teams` | Club catalog synced from football data source |
| `divisions` | Province + reeks structure |
| `storyIdeas` | AI-generated pitches with scores and source context |
| `interviewRequests` | WhatsApp outreach state, contact info |
| `interviews` | Recordings, transcripts, voice session metadata |
| `agentRuns` | Step-by-step workflow state for human review |
| `newsletterIssues` | Draft/sent issues, article selection, send stats |
| `media` | R2 file references (images, audio) |

Indexes: by email, by slug, by publish status, by subscriber preferences for newsletter segmentation.

---

## Authentication & access

| Audience | Mechanism |
|----------|-----------|
| **Subscribers (readers)** | Email capture at gate → Better Auth session via **HttpOnly cookie**; magic link only for first login on a device or after expiry |
| **Admin (journalists)** | Better Auth — email/password or OAuth; role-based access to dashboard |
| **Webhooks** | Twilio, Resend, Vercel deploy hooks — signed secrets |

Article gate flow (from design):

1. User hits gated article → blurred preview + bottom sheet.
2. Enter email → validate → step 2 preferences (min. one division or team).
3. Save → unlock article + add to subscriber list + **session cookie set** (stays logged in).
4. Returning users on same device: cookie auto-authenticates — no magic link.
5. Returning users on new device / expired session: *"Al abonnee? Log in"* → magic link → cookie set for 90 days (proposed).

**Session storage:** HttpOnly `Secure` `SameSite=Lax` cookies via Better Auth — **not** localStorage (XSS risk). See [01-news-site.md § Subscriber session persistence](./01-news-site.md#subscriber-session-persistence).

---

## Cross-component integrations

| From → To | Integration |
|-----------|-------------|
| Admin → News site | Publish triggers static rebuild; article JSON/MDX exported or fetched at build |
| Admin → Newsletter | Published articles available for issue curation |
| News site → Convex | Signup, preferences, gate verification |
| News site → Resend | Double opt-in confirmation (TBD) |
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
- Magic link / session unlock (HttpOnly cookies, 90-day sliding session)
- SEO, sitemap, RSS (optional)

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
- React Email templates
- Issue builder in admin
- Weekly send automation
- Preference-based content blocks (TBD)

---

## Non-functional requirements

| Concern | Approach |
|---------|----------|
| **Performance** | Static pages on CDN; minimal client JS on public site |
| **Privacy (GDPR)** | Consent at signup, unsubscribe in every email, data export/delete |
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
5. Legal copy and double opt-in requirements for Belgian email marketing.
