# Statische content, gate en SEO

## Beslissing: volledig statische soft gate

Alle artikelvarianten worden tijdens `next build` gegenereerd en als HTML/assets via Vercel CDN geleverd. Er is geen server render en geen Convex-fetch nodig om een artikeltekst te lezen.

Voor gated artikels staat de volledige body in de statische HTML. Een clientcomponent:

1. controleert de Better Auth-session;
2. toont tijdens controle een stabiele loading/skeleton state;
3. toont zonder leestoegang de verplichte gate over het gated deel;
4. maakt met leestoegang de volledige body zichtbaar.

### Waarom dit de beste match is

| Eis | Resultaat |
|-----|-----------|
| Volledig statisch | Volledige pagina kan op CDN en zonder runtime contentfetch |
| Snel | Geen database-roundtrip voor body |
| SEO | Google ziet dezelfde volledige HTML als iedere browser |
| Eenvoud | Geen per-artikel encryptiesleutels of content-API |
| Gratis registratiegate | Soft gate is voldoende als leadgenerator |

### Expliciete beperking

Dit is geen harde paywall. De tekst bestaat in de HTML en kan door iemand met devtools, uitgeschakelde JavaScript of scraping worden gelezen. CSS-blur, encoding of client-side JavaScript zijn geen beveiliging.

Encryptie van een statische payload lost dit alleen op als de decryptiesleutel na een geauthenticeerde backendcontrole wordt verstrekt. Dat voegt runtime-infrastructuur toe en verhindert eenvoudige volledige indexing. Omdat abonnement en toegang gratis zijn, kiest het MVP bewust voor conversie en SEO boven harde contentbescherming.

## Artikelopbouw

### Altijd publiek zichtbaar

- categorie/kicker en reeks;
- H1-headline;
- dek/intro;
- hoofdbeeld met beschrijvende alttekst en bron/credit;
- auteur;
- publicatie- en wijzigingsdatum;
- leestijd;
- eerste 2–3 inhoudelijke alinea's (“lead-in”);
- deelknoppen en canonieke URL.

Dit volgt Google's aanbeveling voor lead-in sampling: geef genoeg inhoud om de waarde van het artikel te tonen en laat de gate pas vóór de kern/verdieping starten.

### Gated deel

```html
<div class="article-lead">
  <!-- intro + eerste 2–3 alinea's -->
</div>
<div class="paywall" data-nosnippet>
  <!-- resterende statische artikelbody -->
</div>
```

- `.paywall` is de enige gated wrapper en wordt niet genest.
- `data-nosnippet` voorkomt dat verborgen midden-/slotpassages als zoeksnippet worden getoond.
- De sheet begint visueel bij de overgang naar `.paywall`; geen willekeurige blur over headline of beeld.
- Zonder geldige sessie kan de gebruiker de sheet niet sluiten.

## Vrije artikels

Voeg aan artikelmetadata toe:

```typescript
isGated: boolean;
```

- `true` (default): lead-in + gate; `isAccessibleForFree: false`.
- `false`: volledige body zichtbaar; geen gate; `isAccessibleForFree: true`.

Gebruik vrije artikels voor belangrijke publieke dossiers, uitlegstukken, campagnes en SEO-landingscontent. De redactie bepaalt dit per artikel.

## Google News en structured data

Elke pagina krijgt geldige `NewsArticle` JSON-LD:

```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://voetbalgazet.be/verhalen/voorbeeld"
  },
  "headline": "Artikelkop",
  "description": "Dek of korte intro",
  "image": ["https://.../beeld-16x9.jpg"],
  "datePublished": "2026-07-14T12:00:00+02:00",
  "dateModified": "2026-07-14T12:00:00+02:00",
  "author": {
    "@type": "Person",
    "name": "Auteur"
  },
  "publisher": {
    "@type": "Organization",
    "name": "De Voetbalgazet",
    "logo": {
      "@type": "ImageObject",
      "url": "https://voetbalgazet.be/logo.png"
    }
  },
  "isAccessibleForFree": false,
  "hasPart": {
    "@type": "WebPageElement",
    "isAccessibleForFree": false,
    "cssSelector": ".paywall"
  }
}
```

Regels:

- gated en ungated metadata moeten overeenkomen met de echte pagina;
- Googlebot krijgt dezelfde HTML als andere clients: geen user-agent cloaking;
- voor `isGated: false` wordt `isAccessibleForFree: true` gebruikt en `hasPart` weggelaten;
- test templates met Rich Results Test en URL Inspection;
- voeg Googlebot-News niet via een geheime bypass toe: de statische HTML is al crawlbaar.

Bron: [Google Search Central — Subscription and Paywalled Content](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content).

## Metadata en social sharing

Per artikel:

- unieke `<title>` en meta description op basis van headline/dek;
- canonical URL;
- Open Graph `article` metadata;
- `og:title`, `og:description`, `og:image`, `article:published_time`, `article:modified_time`, auteur;
- Twitter/X large image card;
- 1200×630 social image naast originele beeldvarianten;
- absolute URLs;
- geen subscriber- of authtokens in share-URL's.

De sociale preview toont headline, dek en beeld, ook voor gated artikels.

## Sitemap en nieuwsfeed

- `/sitemap.xml`: alle gepubliceerde canonieke artikels, inclusief gated.
- Google News sitemap als publicatiefrequentie en Google News-deelname dit relevant maken; alleen recente nieuwsartikels.
- `robots.txt`: laat artikelpagina's crawlen; blokkeer authcallback- en tokenroutes.
- Verwijder ingetrokken artikels uit nieuwe builds en handel bestaande URL's af met 404/410 volgens publicatiebeleid.

## RSS

Publiceer `/feed.xml` als RSS 2.0:

- titel, dek, publicatiedatum, auteur, categorie/reeks;
- hoofdbeeld/mediametadata waar compatibel;
- publiek zichtbare lead-in, richtwaarde 150–300 woorden;
- “Lees verder” met canonieke artikel-URL;
- gated body niet volledig in de feed;
- vrije artikels mogen voor consistentie ook excerpt-only blijven.

Geen tokenized full-content RSS in het MVP. Dit vergroot complexiteit, tokens in feedreaders en supportlast, terwijl newsletterlinks de gewenste frictieloze volledige toegang al bieden.

## Zoekfunctie

Aanbevolen MVP:

- statische Pagefind- of eigen build-index;
- indexeer headline, dek, kicker, auteur, reeks en publieke lead-in;
- indexeer de gated body niet in publiek teruggegeven snippets;
- resultaten zijn voor iedereen identiek;
- klik opent canonieke artikelpagina en gate/session bepaalt zichtbaarheid.

Zo blijft zoeken statisch en voorkom je dat volledige gated passages via zoekresultaatsnippets uitlekken.

## Build- en publishflow

1. Redactie publiceert artikel in Convex.
2. Publishactie maakt een immutable content snapshot/revisie.
3. Signed Vercel deploy hook start build.
4. Build haalt alleen gepubliceerde snapshots uit Convex.
5. Next.js genereert homepage, archief, artikel, sitemap, RSS en zoekindex.
6. Tests controleren metadata, gebroken links, afbeeldingen en schema.
7. Vercel promoot build atomair.

Convex is de contentbron; de geleverde publieke site blijft volledig statisch.

## Acceptatiecriteria

- Artikelbody vraagt na paginalaad geen netwerkrequest.
- Met JavaScript aan toont een ongeldige sessie altijd de verplichte sheet.
- Geldige reader- en verifiedSubscriber-sessies tonen body zonder flitsende gate.
- Headline, dek, beeld en 2–3 alinea's zijn publiek.
- Gated JSON-LD gebruikt `.paywall` correct.
- Vrij artikel heeft geen gate en `isAccessibleForFree: true`.
- RSS bevat nooit volledige gated body.
- Lighthouse en Rich Results Test geven geen kritieke templatefouten.
