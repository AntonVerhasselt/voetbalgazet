# Artikelmodel en publicatie

## Keystatic collection

Collection: `articles`

```text
apps/web/content/articles/{slug}.mdoc
```

Gebruik `entryLayout: "content"` zodat de Markdocbody centraal staat en metadata in een zijpaneel/drawer verschijnt.

## Velden

### Identiteit en status

| Veld | Type | Regels |
|------|------|--------|
| `title` / slug | `fields.slug` | Uniek, lowercase URL-safe slug |
| `status` | select | `draft`, `published`, `archived` |
| `publishedAt` | datetime? | Verplicht bij published |
| `updatedAt` | datetime? | Bij inhoudelijke update |
| `author` | relationship/select | Verplicht |

### Redactioneel

| Veld | Type | Regels |
|------|------|--------|
| `headline` | text | Verplicht; mobiele headline-preview |
| `dek` | textarea | Verplicht; korte intro/social description |
| `kicker` | text/select | Optioneel |
| `category` | select/relationship | Verplicht |
| `body` | Markdoc | Verplicht |
| `isGated` | checkbox | Default true |
| `featured` | checkbox | Default false |

### Voetbalmetadata

| Veld | Type | Regels |
|------|------|--------|
| `province` | select | Optioneel indien niet relevant |
| `divisionKeys` | multiselect | Stabiele keys uit `divisions.yaml` |
| `teamKeys` | multiselect | Stabiele keys uit `teams.yaml` |

Voor het MVP zijn deze waarden metadata voor filters en voorkeuren, geen losse standen-/clubproducten.

### Beeld

| Veld | Type | Regels |
|------|------|--------|
| `heroImage` | Keystatic image | Verplicht voor published tenzij expliciete text-only uitzondering |
| `heroAlt` | text | Verplicht |
| `heroCredit` | text | Verplicht wanneer externe maker |
| `socialImage` | image? | Optioneel override; anders afgeleid |

Markdoc inlinebeelden vereisen:

- alttekst;
- optionele caption;
- credit waar nodig.

### SEO en distributie

| Veld | Type | Regels |
|------|------|--------|
| `seoTitle` | text? | Default headline |
| `seoDescription` | textarea? | Default dek |
| `canonicalOverride` | URL? | Admin-only uitzonderingsveld |
| `excludeFromSearch` | checkbox | Default false |

## Markdoc componentenset

Beperk tot geteste, mobiele componenten:

- paragraph;
- heading h2/h3;
- blockquote;
- pull quote;
- image + caption/credit;
- divider;
- ordered/unordered list;
- link;
- eventueel factbox.

Geen willekeurige React-componenten, scripts, embeds of custom HTML in MVP.

## Validatie

### Tijdens editing

- required fields;
- headline/dek length feedback;
- slug preview;
- alt/credit feedback;
- statusafhankelijke velden;
- mobile article previewlink.

### Buildblockers

- duplicate slug;
- invalid Markdoc;
- published zonder datum/auteur/dek;
- ontbrekende hero alt;
- onbekende categorie/reeks/team ID;
- onveilige link;
- invalid canonical;
- image ontbreekt;
- gated metadata inconsistent.

Warnings:

- headline te lang op 360 px;
- dek te lang voor card/social;
- body zonder tussenkop na lange sectie;
- zeer groot beeld;
- geen publieke lead-in van 2–3 alinea's;
- toekomstige datum.

## Draftflow

1. Nieuw artikel start `draft`.
2. Save schrijft Git commit.
3. Draft verschijnt niet in publieke `generateStaticParams`, sitemap, RSS of searchindex.
4. Preview via draft mode toont exacte pagina.
5. Editor controleert mobiele gate, ungated view, metadata en links.

## Publishflow

1. Zet `status = published`.
2. Vul `publishedAt`.
3. Save naar productiebranch.
4. GitHub webhook/repository push start Vercel build.
5. Build valideert alle content.
6. Nieuwe deployment wordt alleen gepromoot bij succesvolle build.
7. Artikel verschijnt in homepage/archive/sitemap/RSS/search volgens metadata.

Er is geen aparte Convex publishmutation of deploy hook.

## Updateflow

- inhoud wijzigen;
- `updatedAt` bij inhoudelijke wijziging;
- commit triggert rebuild;
- canonical URL/slug bij voorkeur niet wijzigen;
- slug is na eerste publicatie immutable in de gewone UI;
- uitzonderlijke slugwijziging vereist expliciete redirect- en analyticsmigratie;
- Git history blijft rollbackbron.

## Archive/retraction

`archived`:

- uit homepage, archief, sitemap, RSS en searchindex;
- route geeft 404, 410 of rechtzettingspagina volgens redactioneel beleid;
- redirect nooit stilzwijgend naar homepage;
- eerdere nieuwsbriefhandmatige links kunnen daardoor een nette statuspagina krijgen.

## Mobile-first contentregels

- headline op 360 px testen;
- dek maximaal enkele scanbare regels;
- body standaard 17–18 px, line-height circa 1.65;
- geen horizontale overflow;
- tabellen vermijden of mobiel scrollbaar;
- beelden responsief met width/height om CLS te voorkomen;
- captions en credits leesbaar op smalle schermen;
- pull quotes niet breder dan viewport;
- links en footnotes grote tap targets;
- lead-in/gateovergang vóór productie op 320 en 375 px testen.

## Source-of-truthcontract

- Keystatic/Git: artikelcontent, metadata, status, images;
- Convex: subscribers, preferences, sessions, newsletter operations;
- Vercel: build/deployment state;
- PostHog: privacyvriendelijke publieke gebruiksmetingen.

Geen systeem schrijft een tweede mutable artikelkopie.
