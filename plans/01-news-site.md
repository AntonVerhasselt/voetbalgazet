# Component 1 — Public News Site

## Purpose

A **fully static** Next.js blog-style site in Dutch covering local football in Flanders. Articles are discoverable (headlines, dek, metadata) but **full content is email-gated**. New readers subscribe via a short form and set preferences (divisions + favourite team).

---

## Design reference

Implement layouts and components from the Open Design prototype:

```
/Users/antonverhasselt/Library/Application Support/Open Design/namespaces/release-stable-intel/data/projects/a132ea15-213e-409f-9e25-e762711453c3
```

| Screen | File | Notes |
|--------|------|-------|
| Homepage | `homepage.html` | Compact masthead, hero feature + "Het laatste" sidebar, inline subscribe band |
| Article (full) | `article.html` | Editorial typography, drop cap, blockquote, reading time |
| Article (gated) | `article-gate.html` | Blurred body + expanding bottom sheet gate |
| Shared styles | `styles.css`, `brand-spec.md` | Tokens, masthead, buttons, gate, preference UI |
| Gate logic | `subscribe.js` | Multi-step flow prototype |

**Voice:** *Lokaal voetbal, echte verhalen.*

---

## Pages & routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Static | Homepage — featured story, latest list, subscribe CTA |
| `/verhalen` | Static | Archive / category listing (TBD) |
| `/verhalen/[slug]` | Static | Article page with gate for unsubscribed visitors |
| `/abonneren` | Static or redirect | Standalone subscribe (optional; homepage + gate cover this) |
| `/inloggen` | Client | Magic link login for returning subscribers |
| `/voorkeuren` | Auth required | Edit division/team preferences |
| `/privacy`, `/voorwaarden` | Static | Legal (TBD) |

---

## Static generation strategy

**Goal:** Public HTML served from Vercel CDN with no server render for article reads.

### Option A — MDX/markdown in repo (recommended start)
- Articles committed as MDX in `content/articles/`
- `next build` generates all pages
- Frontmatter: title, dek, kicker, division, author, date, slug, featured image
- Webhook from admin publish → trigger Vercel rebuild

### Option B — Convex as CMS at build time
- Build script fetches published articles from Convex
- Same static output, content managed in dashboard

**Gate handling on static pages:**
- Static HTML includes teaser + blurred/truncated body (or placeholder)
- Client checks subscriber session (cookie / local storage token)
- If valid → fetch full content from Convex API or embed encrypted payload
- If invalid → show gate sheet (matches `article-gate.html`)

> **Open question:** Full static body in HTML vs. client fetch after auth affects SEO and paywall semantics. Need to decide.

---

## Email gate flow

Matches prototype `article-gate.html` + `subscribe.js`:

### Step 1 — Email
- Copy: *"Abonneer om verder te lezen"*
- Dek: *"Dit artikel is gratis, maar je hebt een abonnement op De Voetbalgazet nodig om het volledig te lezen. Eén e-mail per week — lokaal voetbal, geen ruis."*
- Validate email format
- Store pending signup in Convex
- Send confirmation / magic link via Resend (TBD: double opt-in)

### Step 2 — Preferences
- Copy: *"Jouw voorkeuren"* — *"Zoek clubs of kies reeksen — minstens één keuze."*
- **Favourite club:** searchable autocomplete (from `teams` table)
- **Favourite reeks:** province tabs (5 Flemish provinces) + division chips (P1, P2-A, P2-B, P3-A, P3-B, P3-C per prototype)
- Validation: at least one division OR one team
- CTA: *"Opslaan en verder lezen"*

### Step 3 — Success
- *"Welkom bij De Voetbalgazet."*
- Unlock article in UI
- Set subscriber session

### Returning subscribers
- *"Al abonnee? Log in."* → magic link to email
- Session unlocks all articles without re-gating

### Dismiss
- *"Niet nu"* closes sheet; blurred content remains

---

## Preference data model

From prototype (`subscribe.js`):

```typescript
// Province keys
"Antwerpen" | "Limburg" | "Oost-Vlaanderen" | "West-Vlaanderen" | "Vlaams-Brabant"

// Division keys stored as "Province::Division"
"Antwerpen::P1", "Oost-Vlaanderen::P3-B", ...

// Teams
{ name: string, province: string }
```

**Production:** Replace hardcoded `TEAMS` array with Convex `teams` table synced from official or curated source.

---

## Homepage layout (from design)

1. **Masthead** — centered logo, search toggle, "Abonneren" CTA top-right, edition date line
2. **Home fold** — large feature story (left) + "Het laatste" list (right)
3. **Section grids** — more stories by division/category (extend from prototype)
4. **Subscribe band** — inline email → preferences flow (same component as gate step 2)

---

## Article layout (from design)

- Kicker (division · context) — mono, uppercase
- H1 headline — Playfair Display
- Dek — lead paragraph
- Byline — author, date, reading time
- Body — 17px body, drop cap on first paragraph, blockquotes, subheads
- Footer — copyright + tagline

---

## Tech implementation

| Concern | Choice |
|---------|--------|
| Framework | Next.js 15+ App Router |
| Styling | Tailwind + CSS variables from `styles.css` |
| Fonts | Playfair Display (Google Fonts) + system sans |
| Hosting | Vercel |
| Subscriber API | Convex mutations/queries |
| Auth (readers) | Better Auth magic link OR lightweight JWT session |
| Email | Resend via Convex component |
| Images | Next/Image + R2 URLs |
| Search | Client-side or Pagefind on static build (TBD) |
| i18n | Dutch only; `lang="nl"` |

---

## SEO & social

- Open Graph + Twitter cards per article
- Structured data (`NewsArticle`)
- Sitemap.xml at build
- Canonical URLs
- Gated content: show headline/dek to crawlers; full body policy TBD

---

## Analytics (optional)

PostHog via Convex component:
- Page views, gate impressions, signup funnel (email → prefs → success)
- Article unlock rate

---

## Dependencies on other components

| Dependency | Why |
|------------|-----|
| **Admin** | Publishes articles → triggers rebuild |
| **Newsletter** | Subscriber emails collected here feed newsletter list |
| **Convex** | Subscribers, teams, divisions, session validation |

---

## MVP checklist

- [ ] Port design tokens + masthead + footer
- [ ] Homepage with static mock articles
- [ ] Article template (full + gated variants)
- [ ] Gate sheet component (email → prefs → success)
- [ ] Convex subscriber signup mutation
- [ ] Team/division picker wired to real data
- [ ] Magic link login for returning users
- [ ] Publish pipeline (even manual MDX first)
- [ ] Vercel deploy + rebuild webhook stub

---

## Open questions

1. Double opt-in required for Belgian law?
2. Can unsubscribed users read any articles fully (editor's choice flag)?
3. Full-text search scope — titles only or body?
4. Categories beyond division (e.g. "Transfernieuws", "Jeugd", "Analyse" from prototype)?
5. RSS feed — full or excerpt only?
