# Component 1 — Publieke nieuwssite

## Doel

Een snelle, volledig statische Nederlandstalige nieuwssite over lokaal voetbal in Vlaanderen. Bezoekers kunnen alle headlines, intro's en beelden ontdekken. De volledige tekst is gratis na een e-mailabonnement met nieuwsbrief en voetbalvoorkeuren.

Dit document is het architecturale overzicht. De verfijnde bron van waarheid staat in:

| Detailplan | Inhoud |
|------------|--------|
| [`public-news-site/01-product-decisions.md`](./public-news-site/01-product-decisions.md) | Alle bevestigde keuzes en resterende vragen |
| [`public-news-site/02-access-and-auth.md`](./public-news-site/02-access-and-auth.md) | Better Auth, onmiddellijke toegang en 90-dagensessies |
| [`public-news-site/03-static-content-and-seo.md`](./public-news-site/03-static-content-and-seo.md) | Soft gate, volledig statische body, SEO en RSS |
| [`public-news-site/04-public-ux-and-analytics.md`](./public-news-site/04-public-ux-and-analytics.md) | Publieke UX en PostHog-eventplan |
| [`public-news-site/05-privacy-and-terms-copy.md`](./public-news-site/05-privacy-and-terms-copy.md) | Nederlandstalige juridische conceptcopy |

## Designreferentie

Implementatie volgt de Open Design-prototypefolder:

```text
/Users/antonverhasselt/Library/Application Support/Open Design/namespaces/release-stable-intel/data/projects/a132ea15-213e-409f-9e25-e762711453c3
```

Belangrijkste bestanden: `homepage.html`, `article.html`, `article-gate.html`, `subscribe.js`, `styles.css` en `brand-spec.md`.

De prototypefolder is niet aanwezig op de cloudmachine. Kopieer hem vóór implementatie naar de repository of een gedeelde locatie. Nieuwe productkeuzes hebben voorrang op het prototype: onder meer geen “Niet nu”, geen zelfstandige loginpagina en minstens één verplichte reeks.

**Voice:** *Lokaal voetbal, echte verhalen.*

## Bevestigde productregels

- Nieuwe subscribers lezen onmiddellijk; geen verplichte double opt-in vóór toegang.
- De eerste CTA activeert zowel siteAccess als de wekelijkse nieuwsbrief.
- `siteAccess` en `newsletterSubscribed` zijn aparte flags.
- Nieuwsbrief uitschrijven verwijdert website-toegang niet.
- Sessies duren 90 dagen, sliding, zonder remember-me.
- Apparaten zijn onbeperkt.
- Geen accountpagina, zelfstandige loginpagina of zichtbare logout.
- Gate en homepage gebruiken dezelfde inschrijfflow.
- Geen gate-dismiss: gated content vereist een leessessie.
- Minstens één reeks; maximaal één optionele favoriete club.
- Voorkeuren beïnvloeden alleen de nieuwsbrief, nooit de statische site.
- Redactie kan met `isGated: false` een volledig vrij artikel publiceren.
- Alle analytics via PostHog Cloud EU met privacyvriendelijke defaults.

## Routes

| Route | Type | Beschrijving |
|-------|------|--------------|
| `/` | Statisch | Homepage en inline inschrijving |
| `/verhalen` | Statisch | Artikelarchief |
| `/verhalen/[slug]` | Statisch + client gate | Artikel met lead-in en gated body |
| `/voorkeuren` | Statische shell + verified session | Alleen via veilige e-maillink |
| `/privacy` | Statisch | Privacyverklaring |
| `/voorwaarden` | Statisch | Gebruiksvoorwaarden en wettelijke vermeldingen |
| `/api/auth/*` | Same-origin dynamische handler | Dunne Better Auth/Convex bridge voor cookies en callbacks |

Niet voorzien: `/abonneren`, `/inloggen` en `/account`.

## Statische contentstrategie

Convex is de redactionele contentbron. Bij publiceren:

1. admin maakt een gepubliceerde snapshot;
2. signed deploy hook start Vercel build;
3. build haalt gepubliceerde content op;
4. Next.js genereert homepage, archief, artikels, sitemap, RSS en zoekindex;
5. Vercel levert immutable HTML/assets via CDN.

De volledige artikelbody staat statisch in de HTML. Een geldige Better Auth-reader-session verwijdert de client-side gate. Dit is bewust een **soft registration gate**: uitstekend voor snelheid en SEO, maar technisch omzeilbaar via broncode/devtools. Omdat toegang gratis is, is dit de gekozen MVP-trade-off.

## Publieke artikelpreview

Een gated artikel toont vóór de sheet:

- headline en kicker/reeks;
- dek/intro;
- hoofdbeeld;
- auteur, datum en leestijd;
- eerste 2–3 inhoudelijke alinea's.

De rest staat in één `.paywall`-wrapper met `data-nosnippet`.

SEO:

- `NewsArticle` JSON-LD;
- gated: `isAccessibleForFree: false` + `hasPart.cssSelector: ".paywall"`;
- vrij: `isAccessibleForFree: true`;
- canonical, Open Graph, social image, sitemap en Google News-compatibele metadata;
- Googlebot krijgt dezelfde statische HTML, dus geen cloaking.

RSS bevat metadata en 150–300 woorden lead-in, niet de volledige gated body.

## Toegangsmodel

### Opslag

Gebruik HttpOnly `Secure` `SameSite=Lax` cookies via `@convex-dev/better-auth`, nooit localStorage voor auth.

### Twee niveaus

| Niveau | Toegang | Identiteit |
|--------|---------|------------|
| `reader` | Alle artikels | Anonymous Better Auth-session; geen subscriberdata |
| `verifiedSubscriber` | Alle artikels + voorkeuren wijzigen | E-mail bewezen via magic/newsletter-link |

Een bestaand e-mailadres op een nieuw apparaat geeft onmiddellijk reader-toegang, maar kan de bestaande subscriberidentiteit niet veilig overnemen. Een e-mailadres is geen geheim. De link in de inbox promoveert de sessie zonder de lezer te blokkeren.

### Nieuwe subscriber

1. E-mail.
2. Minstens één reeks + optioneel één club.
3. “Abonneer en lees verder”.
4. `siteAccess = true`, `newsletterSubscribed = true`, consentbewijs opgeslagen.
5. Anonymous reader-session + 90-daagse HttpOnly cookie.
6. Artikel onmiddellijk open.
7. Welkomstmail met link om e-mail/apparaat te verifiëren.

Een typo behoudt alleen reader-toegang op dat apparaat; de identiteit blijft ongeverifieerd.

### Newsletterlinks

Een opaque, ondertekend bootstrap-token wordt via same-origin callback ingewisseld voor een verified 90-dagensessie. Daarna volgt een redirect naar de schone canonieke artikel-URL en opent het artikel volledig. Token/PII komt niet in PostHog of blijvende URLs.

## Better Auth en Convex

Better Auth draait met de Convex-component voor users, sessies, anonymous linking en magic links. Een dunne Next.js handler onder het publieke domein is wel nodig om cookies first-party te zetten en Safari/ITP-problemen met een apart Convex-domein te vermijden. Dit is geen tweede backend: businesslogica en persistente data blijven in Convex.

## Voorkeuren

```typescript
type Province =
  | "Antwerpen"
  | "Limburg"
  | "Oost-Vlaanderen"
  | "West-Vlaanderen"
  | "Vlaams-Brabant";

type DivisionKey = `${Province}::${string}`;
```

- minstens één `divisionId`;
- maximaal één optionele `favoriteTeamId`;
- teams/reeksen komen uit Convex;
- aanpassen via veilige link in de nieuwsbrief;
- alleen verifiedSubscriber mag bestaande voorkeuren lezen/wijzigen.

## Homepage

1. Masthead met logo, zoeken en “Abonneren”.
2. Feature story + “Het laatste”.
3. Statische secties per categorie/reeks.
4. Inline inschrijving met exact dezelfde logica als de article gate.
5. Footer met privacy, voorwaarden en support.

## Analytics

PostHog Cloud EU, cookieless publieke default, IP-capture uit:

- page/article views;
- gate impressions;
- e-mail- en voorkeurenstappen zonder e-mailwaarde;
- signup success/failure;
- artikelunlock en leesdiepte;
- newsletter bootstrap;
- voorkeurenupdates;
- auth/errorcodes en Core Web Vitals.

Geen raw e-mail, e-mailhash, magic token, vrije formuliertekst of URL-token. Session replay is geen MVP zonder aparte analyticsconsent.

## Juridisch

- Single opt-in met één duidelijke bevestigende CTA en privacy-/voorwaardenlinks.
- Geen prechecked checkbox.
- Elke nieuwsbrief heeft een gratis uitschrijflink.
- Uitschrijven laat siteAccess bestaan.
- Verwijderverzoek via support; volledige verwijdering trekt siteAccess en sessies in.
- `/privacy` en `/voorwaarden` zijn verplicht vóór launch.
- Conceptcopy staat in [`public-news-site/05-privacy-and-terms-copy.md`](./public-news-site/05-privacy-and-terms-copy.md).
- Laat de gecombineerde initiële nieuwsbrief + artikeltoegang vóór lancering Belgisch juridisch beoordelen.

## MVP-checklist

- [ ] Open Design-assets in toegankelijke repository plaatsen
- [ ] Design tokens, masthead, footer en responsive layouts
- [ ] Statische homepage, archief en artikeltemplate
- [ ] `isGated` en publieke lead-in
- [ ] Verplichte gate zonder dismiss
- [ ] Gedeelde gate/homepage inschrijfflow
- [ ] Convex subscriberstatussen en consentrecord
- [ ] Better Auth Convex-component, anonymous + magic link
- [ ] 90-daagse HttpOnly sessions
- [ ] Same-origin `/api/auth/*` handler
- [ ] Resend welkomst-/verificationmail
- [ ] Newsletter bootstrap exchange
- [ ] Reeks- en clubpicker met echte data
- [ ] Verified preferences-route
- [ ] PostHog eventtaxonomie en dashboards
- [ ] NewsArticle/paywall JSON-LD, canonical, OG, sitemap
- [ ] Excerpt-only RSS
- [ ] Privacy en voorwaarden invullen + juridische review
- [ ] Accessibility, security, performance en SEO-tests
- [ ] Publish/rebuildpipeline

## Resterende beslissingen

1. Definitieve domein- en bedrijfsgegevens.
2. Categorieën/filters voor `/verhalen`.
3. Officiële club- en reeksbron.
4. Newsletter bootstrap-token: voorstel 30 dagen.
5. Inactiviteitsbeleid voor actieve siteAccess-profielen.
6. Juridische goedkeuring van inschrijfcopy en bewaartermijnen.
