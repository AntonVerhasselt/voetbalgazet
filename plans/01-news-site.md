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
| `/inloggen` | Client | Magic link login for returning subscribers (new device / expired session) |
| `/auth/callback` | Server route | Magic link verification → sets session cookie → redirect |
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
- Client checks subscriber session via Better Auth (`getSession` / `useSession`)
- Session is stored in an **HttpOnly cookie** (not localStorage) — see [Subscriber session persistence](#subscriber-session-persistence)
- If valid → fetch full content from Convex API or embed encrypted payload
- If invalid → show gate sheet (matches `article-gate.html`)

> **Open question:** Full static body in HTML vs. client fetch after auth affects SEO and paywall semantics. Need to decide.

> **Note:** Public article pages can remain static (SSG/ISR). Auth API routes (`/api/auth/*`) must be dynamic on the same domain so session cookies work. A pure `output: 'export'` build is **not** compatible with cookie-based auth unless auth is proxied on the same origin.

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
- Create Better Auth session → **HttpOnly session cookie** set on response
- Subscriber stays logged in across visits until session expires or they log out

### Returning subscribers
- *"Al abonnee? Log in."* → enter email → magic link sent
- User clicks link **once** → `/auth/callback` verifies token → session cookie set
- **Subsequent visits:** browser sends cookie automatically; no magic link needed
- Magic link is only for: new device, cleared cookies, or expired session

### Dismiss
- *"Niet nu"* closes sheet; blurred content remains
- Optional: store dismiss flag in `sessionStorage` (UX only, not auth) so sheet stays closed for the tab session

---

## Subscriber session persistence

### Decision: HttpOnly cookies (not localStorage)

Research conclusion — **do not store auth tokens in localStorage or sessionStorage**:

| Storage | Verdict | Why |
|---------|---------|-----|
| **HttpOnly cookie** | ✅ Recommended | Invisible to JavaScript → XSS cannot steal session. Industry standard (OWASP, Better Auth default). |
| **localStorage** | ❌ Reject | Any script on the page can read tokens. One XSS = full account takeover. |
| **sessionStorage** | ❌ For auth | Same XSS risk; also lost when tab closes. OK only for non-sensitive UX state (e.g. gate dismissed). |
| **In-memory token** | ⚠️ Partial | Safe from persistence theft but user logged out on every refresh — bad UX for a news site. |

**Magic link ≠ login every visit.** Magic link is a one-time proof of email ownership. After verification, Better Auth issues a **persistent session cookie** that the browser sends on every request.

### Recommended stack

```
┌─────────────────────────────────────────────────────────────┐
│  Public site (voetbalgazet.be) — same origin                │
├─────────────────────────────────────────────────────────────┤
│  Static pages (SSG)     │  Dynamic auth routes              │
│  /, /verhalen/[slug]    │  /api/auth/* (Better Auth)        │
│                         │  /auth/callback (magic link)      │
└────────────┬────────────┴──────────────┬────────────────────┘
             │                           │
             │  getSession()             │  Set-Cookie: session_token
             │  (cookie sent auto)       │  HttpOnly; Secure; SameSite=Lax
             ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Better Auth via @convex-dev/better-auth                      │
│  Sessions in Convex `session` table                           │
└─────────────────────────────────────────────────────────────┘
```

### Configuration (proposed defaults)

```typescript
// convex/auth.ts (Better Auth config)
session: {
  expiresIn: 60 * 60 * 24 * 90,  // 90 days — TBD with product owner
  updateAge: 60 * 60 * 24 * 7,   // sliding refresh every 7 days of activity
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,              // 5 min cache to reduce DB reads
    strategy: "compact",
  },
},
advanced: {
  defaultCookieAttributes: {
    httpOnly: true,
    secure: true,                // production
    sameSite: "lax",             // allows inbound links from email/newsletter
  },
},
plugins: [
  magicLink({
    expiresIn: 60 * 15,          // magic link itself: 15 min (one-time use)
    sendMagicLink: async ({ email, url }) => {
      // Resend transactional email
    },
  }),
],
```

### Client-side gate unlock flow

```typescript
// On article page mount (client component)
const { data: session, isPending } = authClient.useSession();

useEffect(() => {
  if (session?.user) {
    // Subscriber authenticated — fetch full article body from Convex
    fetchFullArticle(slug);
  }
}, [session, slug]);
```

### What localStorage *may* store (non-auth only)

| Key | Purpose | Sensitive? |
|-----|---------|------------|
| `gate_dismissed_{slug}` | Remember "Niet nu" per article (optional) | No |
| `prefs_draft` | Unsaved preference picker state during signup | No |
| — | **Never** session tokens, subscriber IDs, or emails for auth | — |

### New signup vs. returning login

| Flow | Magic link required? | Session set how? |
|------|---------------------|------------------|
| **New subscriber at gate** (email → prefs → success) | TBD — see open questions (instant unlock vs. verify email first) | On success mutation + Better Auth sign-up |
| **Returning subscriber** ("Al abonnee? Log in") | Yes, once per device/session expiry | Click magic link → cookie |
| **Newsletter link** (`?token=…` in email) | Could double as session bootstrap | TBD — see open questions |

### Security notes

- **CSRF:** Better Auth handles CSRF for cookie-based auth; keep `disableCSRFCheck: false`.
- **Logout:** `authClient.signOut()` revokes server session + clears cookie.
- **Shared devices:** Optional "Uitloggen" link in footer; consider shorter `expiresIn` if concern.
- **Safari / ITP:** Auth API must be **same origin** as the site (not a separate Convex URL in the browser). Proxy `/api/auth` through Next.js on Vercel.

### Rejected alternatives

| Alternative | Why rejected |
|-------------|--------------|
| Custom JWT in localStorage | XSS risk; reinventing what Better Auth already does with cookies |
| Subscriber ID in localStorage | Trivially spoofable — anyone could paste a fake ID |
| Long-lived opaque token in URL (`?sub=abc`) | Leaks via referrers, browser history, analytics |
| Password for readers | Unnecessary friction for a free email-gated newsletter site |

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
| Auth (readers) | Better Auth magic link + **HttpOnly session cookies** (via `@convex-dev/better-auth`) |
| Session storage | HttpOnly `Secure` `SameSite=Lax` cookie — **not** localStorage |
| Session duration | 90 days sliding (proposed) — magic link only for re-auth |
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
- [ ] Better Auth subscriber auth (magic link + session cookies)
- [ ] Session check on article pages (`useSession` → unlock)
- [ ] `/auth/callback` route for magic link verification
- [ ] Logout ("Uitloggen") in footer
- [ ] Publish pipeline (even manual MDX first)
- [ ] Vercel deploy + rebuild webhook stub

---

## Open questions

### Auth & sessions (new — needs product decisions)

1. **New signup instant unlock vs. email verification:** Can a new subscriber read immediately after gate prefs, or must they click a confirmation link first? (GDPR/marketing law vs. friction)
2. **Session duration:** 30, 90, or 365 days before re-auth? "Remember me" checkbox or always long-lived?
3. **Newsletter deep links:** Should clicking an article link in the weekly email auto-authenticate (signed URL/token), or still require an existing session?
4. **Multi-device policy:** Unlimited concurrent sessions, or cap devices per subscriber?
5. **Account recovery:** If email bounces / typo at signup, any self-service fix or support-only?

### Content & product (existing)

6. Double opt-in required for Belgian law?
7. Can unsubscribed users read any articles fully (editor's choice flag)?
8. Full-text search scope — titles only or body?
9. Categories beyond division (e.g. "Transfernieuws", "Jeugd", "Analyse" from prototype)?
10. RSS feed — full or excerpt only?
