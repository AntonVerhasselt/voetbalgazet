# De Voetbalgazet — Project Plans

> **Lokaal voetbal, echte verhalen.**

Planning documents for a Dutch-language news platform covering local football in Flanders. This folder captures what we know today; plans will be refined iteratively as we chat.

## Documents

| Plan | Description |
|------|-------------|
| [00-general-plan.md](./00-general-plan.md) | Architecture, tech stack, cross-cutting concerns, phasing |
| [01-news-site.md](./01-news-site.md) | Static public site, email gate, subscriber preferences |
| [public-news-site/](./public-news-site/) | Refined public-site decisions, auth, SEO, UX/analytics, legal copy |
| [02-admin-dashboard.md](./02-admin-dashboard.md) | AI journalist dashboard, agent flows, human-in-the-loop |
| [03-newsletter.md](./03-newsletter.md) | Resend React Email builder, sends, subscriber sync |
| [newsletter-admin-dashboard/](./newsletter-admin-dashboard/) | Verfijnd nieuwsbrief-adminplan: visual editor, Convex-data, segmentatie, sending en operations |

## Design reference

The public site and admin dashboard follow the Open Design visual language. The email editor may offer those tokens as defaults, but newsletter and transactional content remains custom:

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
| Email builder | Open-source `@react-email/editor` + React Email renderer | [React Email editor](https://react.email/docs/editor/getting-started) |

## Three components (high level)

```
┌─────────────────────────────────────────────────────────────────┐
│                     DE VOETBALGAZET                              │
├─────────────────┬─────────────────────┬───────────────────────────┤
│  1. News Site   │  2. Admin Dashboard │  3. Newsletter            │
│  (static Next)  │  (AI journalist)    │  (visual React Email)     │
│                 │                     │                           │
│  Email-gated    │  Match analysis     │  Visual campaigns        │
│  articles       │  Idea discovery     │  Preference audiences    │
│  Signup + prefs │  WhatsApp outreach  │  Custom visual editor    │
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
- **Subscriber auth model:** ✅ **Decided** — immediate Better Auth anonymous reader-session, verified identity via magic/newsletter link, 90-day HttpOnly cookie.
- **Article publishing flow:** ✅ **Decided** — Convex content snapshots trigger a fully static Vercel rebuild; client-side soft registration gate.
- **Interview subjects:** How are contacts sourced (club websites, manual CRM, scraped)?
- **Newsletter cadence:** ✅ **Decided** — editorial send-now or explicit schedule in `Europe/Brussels`; no automatic weekly cron.
- **Admin roles:** ✅ **Newsletter decided** — Admin and Journalist can manage/send campaigns; Viewer is read-only; only Admin changes transactional emails. Broader AI-story assignment remains a later admin-plan question.
- **Legal:** Public-site draft copy exists; business placeholders, retention and combined signup proposition still require Belgian legal review.

## Status

| Area | Status |
|------|--------|
| Design prototype | Done (Open Design) |
| Project codebase | Not started |
| Public-siteplan | Completed |
| Newsletter-adminplan | Product/architecture decisions completed — launch inputs tracked separately |
| Other plans | Initial draft — refinement in progress |
