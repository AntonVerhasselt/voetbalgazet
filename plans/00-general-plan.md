# General Plan — De Voetbalgazet

## Vision

De Voetbalgazet is a Flemish local football news platform that combines:

1. A **beautiful, static, newspaper-style public site** where every article is free to discover but requires email subscription to read in full.
2. A **mobile-first content admin** where journalists write and publish articles through Keystatic.
3. An **editorial email newsletter** (typically about once per week, but always send-now or explicitly scheduled) that delivers stories to subscribers, styled consistently with the brand.

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
        ┌───────────────────────┼──────────────────────┐
        │                       │                      │
 Public SSG pages        Custom admin/API       Keystatic UI/API
 (mobile-first)          (auth/newsletter)      (article editing)
        │                       │                      │
        │                 ┌─────▼─────┐          ┌─────▼─────┐
        │                 │  Convex   │          │  GitHub   │
        │                 └─────┬─────┘          │ Markdoc + │
        │                       │                │  images   │
        │              ┌────────┼────────┐       └─────┬─────┘
        │              │        │        │             │
        │         Better Auth Resend    R2             │
        │                    (email) (email media)      │
        └──────────────────────────────────────────────┘
                    build reads repository content

 PostHog JS is optional, privacyvriendelijk en gekoppeld aan publieke/custom-admin browser events. Convex/Resend deliveryevents blijven in Convex en worden niet dubbel als serveranalytics verstuurd.
```

### Repository structure (proposed)

```
voetbalgazet/
├── plans/                    # This folder
├── apps/
│   └── web/
│       ├── src/app/          # Next.js public/admin/Keystatic routes
│       ├── keystatic.config.ts
│       ├── content/
│       │   ├── articles/     # Keystatic Markdoc — article source of truth
│       │   └── settings/     # Taxonomies/authors/editorial
│       └── public/images/articles/
├── convex/                   # Subscribers, auth-adjacent appdata and email backend
│   ├── schema.ts
│   ├── subscribers.ts
│   ├── newsletter.ts
│   └── components/           # Convex component configs
├── emails/                   # Shared editor renderer, variables and locked compliancefooter
└── design/open-design/       # Copied Open Design source/assets
```

---

## Design system

**Source of truth:** Open Design prototype folder (see [README](./README.md#design-reference)).

Shared responsive interpretation: [`ui-ux/`](./ui-ux/). The local source must be copied to `design/open-design/` before visual implementation.

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
| `teams` | Club catalog synced from football data source |
| `divisions` | Province + reeks structure |
| `newsletterCampaigns` | Visual drafts, revisions, audience definitions, immutable sends and aggregate stats |
| `newsletterRecipients` | Bevroren ontvangers en app-level deliverystatus per send |
| `emailMedia` | R2 file references for visual e-mails |

Artikelcontent en publicatiestatus staan niet in Convex; Keystatic/Git is daarvoor de bron van waarheid.

---

## Authentication & access

| Audience | Mechanism |
|----------|-----------|
| **Subscribers (readers)** | Better Auth anonymous reader-session for immediate access; verified identity via magic/newsletter link; 90-day HttpOnly cookie |
| **Admin (journalists)** | Better Auth — email/password or OAuth; role-based access to dashboard |
| **Webhooks/API** | Resend webhooks, Keystatic/GitHub callbacks en authroutes — signed/geauthenticeerd |

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
| Keystatic → News site | Git commit triggert Vercel; build leest Markdoc rechtstreeks |
| Admin → Newsletter | Separate admin navigation only; emailcontent is manually created in the visual editor |
| News site → Convex | Signup, preferences, gate verification |
| News site → Resend | Welcome/verification link; single opt-in newsletter |
| Newsletter → Resend | Batch send to subscriber list |
| Email editor → R2 | Permanente campaign images via `media.devoetbalgazet.be` |
| Keystatic → GitHub | Artikel-Markdoc en artikelbeelden |

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
- Mobile-first dashboard shell matching brand
- Keystatic in dezelfde Next.js-app
- GitHub mode + Markdoc article collection
- Draft preview en publish via Git/Vercel

Detailed source of truth: [`content-admin/`](./content-admin/).

### Phase 4 — Newsletter
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
| **Content integrity** | Keystatic schema + buildvalidatie + Git history |
| **Observability** | Convex logs + optional PostHog for site analytics |

---

## Documentation links

- [Convex](https://docs.convex.dev/)
- [Better Auth (Convex)](https://www.convex.dev/components/better-auth)
- [Cloudflare R2 (Convex)](https://www.convex.dev/components/cloudflare-r2)
- [Resend (Convex)](https://www.convex.dev/components/resend)
- [PostHog Next.js](https://posthog.com/docs/libraries/next-js)
- [Keystatic](https://keystatic.com/docs/installation-next-js)
- [Vercel](https://vercel.com/)

---

## Next refinement topics

1. Kopieer Open Design-bron/assets naar de repository.
2. Configureer Keystatic GitHub App en repositoryrechten.
3. Bevestig privacy-/supportadres en verantwoordelijke uitgever.
4. Importeer officiële club-/reekstaxonomie.
5. Rond mobile usabilitytests voor site, Keystatic en nieuwsbriefadmin af.
