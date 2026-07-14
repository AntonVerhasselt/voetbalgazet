# De Voetbalgazet — Project Plans

> **Lokaal voetbal, echte verhalen.**

Planning documents for a Dutch-language news platform covering local football in Flanders. This folder captures what we know today; plans will be refined iteratively as we chat.

## Documents

| Plan | Description |
|------|-------------|
| [00-general-plan.md](./00-general-plan.md) | Architecture, tech stack, cross-cutting concerns, phasing |
| [01-news-site.md](./01-news-site.md) | Static public site, email gate, subscriber preferences |
| [public-news-site/](./public-news-site/) | Refined public-site decisions, auth, SEO, UX/analytics, legal copy |
| [02-admin-dashboard.md](./02-admin-dashboard.md) | Content- en nieuwsbriefadmin binnen dezelfde Next.js-app |
| [content-admin/](./content-admin/) | Keystatic, artikelmodel, publishing en mobile admin-UX |
| [03-newsletter.md](./03-newsletter.md) | Resend React Email builder, sends, subscriber sync |
| [newsletter-admin-dashboard/](./newsletter-admin-dashboard/) | Verfijnd nieuwsbrief-adminplan: visual editor, Convex-data, segmentatie, sending en operations |
| [ui-ux/](./ui-ux/) | Gedeelde mobile-first UI/UX-regels voor site, admin en e-mail |

## Design reference

The public site and admin dashboard follow the Open Design visual language. The email editor may offer those tokens as defaults, but newsletter and transactional content remains custom:

**Design folder (local):**

```text
/Users/antonverhasselt/Library/Application Support/Open Design/namespaces/release-stable-intel/data/projects/a132ea15-213e-409f-9e25-e762711453c3
```

Deze cloudomgeving kon de map opnieuw niet openen. Kopieer de bron naar `design/open-design/` in de repository vóór pixel-perfect uitvoering. Zie [`ui-ux/`](./ui-ux/).

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
| Frontend | Next.js on Vercel; publieke routes SSG, admin/API serverroutes | [Vercel](https://vercel.com/) |
| Backend / DB | Convex | [Convex docs](https://docs.convex.dev/) |
| Auth | Better Auth via Convex component | [Better Auth component](https://www.convex.dev/components/better-auth) |
| Artikelcontent | Keystatic GitHub mode + Markdoc | [Keystatic](https://keystatic.com/docs/installation-next-js) |
| Artikelbeelden | Keystatic image fields in repository | [Image field](https://keystatic.com/docs/fields/image) |
| E-mailbeelden | Cloudflare R2 via Convex component | [R2 component](https://www.convex.dev/components/cloudflare-r2) |
| Email | Resend via Convex component (transactional + newsletter) | [Resend component](https://www.convex.dev/components/resend) |
| Analytics (optional) | PostHog JS, privacyvriendelijk/cookieless op publieke site en custom admin | [PostHog Next.js](https://posthog.com/docs/libraries/next-js) |
| Email builder | Open-source `@react-email/editor` + React Email renderer | [React Email editor](https://react.email/docs/editor/getting-started) |

## Three functional areas in one Next.js/Vercel deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                     DE VOETBALGAZET                              │
├─────────────────┬─────────────────────┬───────────────────────────┤
│  1. News Site   │  2. Admin Dashboard │  3. Newsletter            │
│  (static Next)  │  (Keystatic/content)│  (visual React Email)     │
│                 │                     │                           │
│  Email-gated    │  Article editing    │  Visual campaigns        │
│  articles       │  Draft preview      │  Preference audiences    │
│  Signup + prefs │  Git publishing     │  Custom visual editor    │
│                 │  Admin navigation   │                           │
└────────┬────────┴──────────┬──────────┴─────────────┬─────────────┘
         │                   │                        │
         └───────────────────┴────────────────────────┘
                             │
               Convex + Keystatic/GitHub
           (subscribers/e-mail + article files)
```

## Remaining topics (not blocking planning)

- **Team/division catalog:** Prototype uses hardcoded Flemish provinces + P1/P2/P3 divisions — mirror official Voetbal Vlaanderen structure during taxonomy import ([`content-admin/05-taxonomies-and-settings.md`](./content-admin/05-taxonomies-and-settings.md)).
- **Subscriber auth model:** ✅ **Decided** — immediate Better Auth anonymous reader-session, verified identity via magic/newsletter link, 90-day HttpOnly cookie.
- **Article publishing flow:** ✅ **Decided** — Keystatic/Git is source of truth; publish commit triggers Vercel SSG rebuild; client-side soft registration gate.
- **Newsletter cadence:** ✅ **Decided** — editorial send-now or explicit schedule in `Europe/Brussels`; no automatic weekly cron.
- **Admin roles:** ✅ **Decided for current scope** — Admin and Journalist manage campaigns/articles; Viewer read-only; only Admin changes transactional emails.
- **Legal:** ✅ KBO verified ([1017.634.522](https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=1017634522)) — YARU DAKEN BV; privacy/support address, responsible publisher and final Belgian legal review remain launch checks.

## Status

| Area | Status |
|------|--------|
| Design prototype | Done (Open Design) |
| Project codebase | Not started |
| Public-siteplan | Completed |
| Newsletter-adminplan | Product/architecture decisions completed — launch inputs tracked separately |
| Content-adminplan | Detailed Keystatic and publishing plan added |
| Shared UI/UX | Mobile-first specification complete; Open Design source still needs repository copy |
| Plan coherence | Cross-references aligned; AI journalist scope removed; Keystatic integrated |
