# De Voetbalgazet — Project Plans

> **Lokaal voetbal, echte verhalen.**

Planning documents for a Dutch-language news platform covering local football in Flanders. This folder captures what we know today; plans will be refined iteratively as we chat.

## Documents

| Plan | Description |
|------|-------------|
| [00-general-plan.md](./00-general-plan.md) | Architecture, tech stack, cross-cutting concerns, phasing |
| [01-news-site.md](./01-news-site.md) | Static public site, email gate, subscriber preferences |
| [02-admin-dashboard.md](./02-admin-dashboard.md) | AI journalist dashboard, agent flows, human-in-the-loop |
| [03-newsletter.md](./03-newsletter.md) | Resend React Email builder, sends, subscriber sync |

## Design reference

All UI (public site, admin dashboard, newsletter templates) should follow the visual language defined in the Open Design prototype:

**Design folder (local):**
```
/Users/antonverhasselt/Library/Application Support/Open Design/namespaces/release-stable-intel/data/projects/a132ea15-213e-409f-9e25-e762711453c3
```

**Key files:**

| File | Purpose |
|------|---------|
| `brand-spec.md` | Colors (OKLch), typography, layout posture, voice |
| `styles.css` | Shared CSS tokens and components |
| `homepage.html` | Homepage layout — hero fold, "Het laatste", inline subscribe |
| `article.html` | Full article page — drop cap, pull quote, editorial typography |
| `article-gate.html` | Gated article — blur + bottom sheet (email → preferences → read) |
| `subscribe.js` | Preference picker logic (provinces, divisions, team search) |
| `index.html` | Prototype launcher / screen overview |

**Brand summary:** Newspaper-inspired editorial design (NYT/WaPo posture). Warm paper white background, ink-black headlines, Playfair Display for display type, hairline rules, no border-radius, subtle paper grain. Tagline: *Lokaal voetbal, echte verhalen.*

## Tech stack (confirmed)

| Layer | Choice | Docs |
|-------|--------|------|
| Frontend | Next.js on Vercel (static export for public site) | [Vercel](https://vercel.com/) |
| Backend / DB | Convex | [Convex docs](https://docs.convex.dev/) |
| Auth | Better Auth via Convex component | [Better Auth component](https://www.convex.dev/components/better-auth) |
| File storage | Cloudflare R2 via Convex component | [R2 component](https://www.convex.dev/components/cloudflare-r2) |
| Email | Resend via Convex component (transactional + newsletter) | [Resend component](https://www.convex.dev/components/resend) |
| AI agents | Convex Agent component + OpenRouter | [Agent component](https://www.convex.dev/components/agent) |
| LLM (general) | OpenRouter | [OpenRouter quickstart](https://openrouter.ai/docs/quickstart) |
| Voice interviews | OpenAI Realtime API | [OpenAI Realtime guide](https://developers.openai.com/api/docs/guides/realtime) |
| WhatsApp + calls | Twilio | [Twilio docs](https://www.twilio.com/docs) |
| Analytics (optional) | PostHog via Convex component | [PostHog component](https://www.convex.dev/components/posthog/convex) |
| Email builder | Resend React Email | (part of Resend component workflow) |

## Three components (high level)

```
┌─────────────────────────────────────────────────────────────────┐
│                     DE VOETBALGAZET                              │
├─────────────────┬─────────────────────┬───────────────────────────┤
│  1. News Site   │  2. Admin Dashboard │  3. Newsletter            │
│  (static Next)  │  (AI journalist)    │  (Resend React Email)     │
│                 │                     │                           │
│  Email-gated    │  Match analysis     │  Weekly digest to all    │
│  articles       │  Idea discovery     │  subscribers from site   │
│  Signup + prefs │  WhatsApp outreach  │  Same visual language    │
│                 │  Voice interviews   │                           │
│                 │  Writing agent      │                           │
│                 │  Human review       │                           │
└────────┬────────┴──────────┬──────────┴─────────────┬─────────────┘
         │                   │                        │
         └───────────────────┴────────────────────────┘
                             │
                      Convex backend
                   (subscribers, articles,
                    agent runs, assets, auth)
```

## Open questions (to refine together)

- **Football data source:** Where do match results, calendars, and standings come from? Manual import, scraping, third-party API (e.g. Voetbal Vlaanderen)?
- **Team/division catalog:** Prototype uses hardcoded Flemish provinces + P1/P2/P3 divisions — do we mirror official Voetbal Vlaanderen structure?
- **Subscriber auth model:** ✅ **Decided** — Better Auth magic link for re-auth + HttpOnly session cookies for persistence (not localStorage). Open: session duration, instant unlock vs. email verify on signup, newsletter deep-link auth.
- **Article publishing flow:** Static rebuild on publish (ISR/webhook) vs. hybrid with Convex-served gated content?
- **Interview subjects:** How are contacts sourced (club websites, manual CRM, scraped)?
- **Newsletter cadence:** "Eén e-mail per week" per design copy — fixed schedule or editorial trigger?
- **Admin users:** Single editor or multi-user newsroom with roles?
- **Legal:** GDPR consent copy, unsubscribe, data retention for interview recordings.

## Status

| Area | Status |
|------|--------|
| Design prototype | Done (Open Design) |
| Project codebase | Not started |
| Plans | Initial draft — **refinement in progress** |
