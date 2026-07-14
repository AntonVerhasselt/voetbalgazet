# Content-admin UI/UX

## Mobile-first uitgangspunt

Ontwerp eerst op 360 × 800 px, valideer daarna:

- 320 px;
- 375/390 px;
- 768 px;
- 1024+ px.

Geen essentiële artikelactie mag alleen via hover, rechtermuisklik of een desktopzijpaneel bereikbaar zijn.

## Adminlanding

Route: `/admin`

### Mobiel

- compacte masthead met De Voetbalgazet-logo en `Redactie`;
- kaart/rij `Artikels schrijven`;
- kaart/rij `Nieuwsbrieven`;
- kaart/rij `Abonnees`;
- statusbadges voor drafts, geplande sends en failures;
- bottom navigation of menu sheet;
- minimaal 44 × 44 px tap targets;
- geen dashboardgrafieken boven primaire taken.

### Desktop

- dezelfde informatiehiërarchie;
- zijbalk/mastheadnav;
- grotere statusoverzichten;
- shortcuts naar recent bewerkte content.

## Keystatic binnen de ervaring

Keystatic blijft full-page op `/keystatic`, maar wordt herkenbaar gemaakt via:

```typescript
ui: {
  brand: {
    name: "De Voetbalgazet",
    mark: BrandMark,
  },
  navigation: {
    Content: ["articles"],
    Instellingen: ["authors", "categories", "editorial"],
  },
}
```

Labels zijn Nederlands:

- Artikels;
- Nieuw artikel;
- Titel;
- Hoofdbeeld;
- Publicatiestatus;
- Auteur;
- Categorie;
- Reeks;
- Club;
- SEO;
- Inhoud.

Keystatic's eigen layout en componenten worden niet via fragiele globale CSS overschreven. Aanpassingen gebeuren via officiële config, schema, brand en entry layout.

## Artikellijst

Prioriteiten:

- zoek op titel/slug;
- filter status;
- recent gewijzigd;
- duidelijke `Nieuw artikel`-CTA;
- status als tekst + kleur;
- geen onleesbare brede tabel op mobiel.

Mobiel:

- list cards/rows;
- headline;
- status;
- datum/editor via GitHub metadata indien beschikbaar;
- grote primaire actie.

Desktop mag tabel/list density verhogen.

## Artikeleditor

`entryLayout: "content"`:

- body centraal;
- metadata in sidebar op desktop;
- metadata als drawer/accordion op mobiel;
- sticky save/status control binnen veilige viewport;
- preview altijd zichtbaar als primaire actie;
- statuswijziging naar published vraagt confirm met gevolgen.

### Mobiele editor

- één kolom;
- editor toolbar compact/sticky en keyboard-safe;
- acties niet onder virtual keyboard;
- metadata gegroepeerd:
  1. Publicatie;
  2. Artikel;
  3. Beeld;
  4. Classificatie;
  5. SEO;
- media upload toont progress/error;
- preview opent nieuw tabblad zodat draft niet verloren gaat.

## Preview-UX

Previewtoolbar:

- `Mobiel 360`;
- `Mobiel 390`;
- `Desktop`;
- gated/ungated toggle;
- terug naar Keystatic;
- draftbanner;
- geen echte analytics capture.

Preview toont:

- homepage card waar relevant;
- artikelkop;
- volledige artikelpagina;
- gateovergang;
- social metadata samenvatting.

## Publishconfirm

Toon:

- headline;
- slug/canonieke URL;
- status;
- publicatiedatum;
- gated/vrij;
- waarschuwingen;
- `Opslaan als gepubliceerd` gevolg: Git commit + Vercel build.

Geen tekst die onmiddellijke livegang belooft: publicatie is pas live na geslaagde build.

## Buildstatus

Omdat Keystatic save en Vercel build gescheiden zijn:

- adminlanding mag laatste deploymentstatus tonen via read-only integratie;
- na publish verschijnt `Publicatie wordt gebouwd`;
- failure toont concrete link naar buildlogs voor Admin;
- Journalist ziet bruikbare foutmelding en kan content herstellen;
- oude production deployment blijft actief bij buildfailure.

Dit is een polishfunctie wanneer Vercelstatus veilig kan worden opgehaald; buildfailure via GitHub/Vercel blijft sowieso zichtbaar.

## Foutstaten

### GitHub-auth ontbreekt

- uitleg dat repository write access nodig is;
- geen generieke 500;
- link naar Admin voor toegang.

### Saveconflict

- Keystatic/GitHub branchstatus volgen;
- nooit silent overwrite beloven;
- Git branch/commit dient als herstelpad.

### Image upload faalt

- inline fout;
- behouden tekst;
- retry;
- geen half gepubliceerde imagepath.

### Build faalt

- gepubliceerd bestand blijft in Git maar nieuwe deployment wordt niet live;
- herstelcommit nodig;
- admin toont dat productie nog oude versie serveert.

## Toegankelijkheid

- keyboardbediening;
- logische headings;
- focus zichtbaar;
- foutmelding gekoppeld aan veld;
- status niet alleen via kleur;
- 44 px targets;
- reduced motion;
- modal focus trap;
- editor toolbar bereikbaar bij zoom 200%;
- screen-reader labels voor image/alt/status.

## Open Design-toepassing

Wanneer de assets beschikbaar zijn:

| Open Design-bestand | Admingebruik |
|---------------------|--------------|
| `brand-spec.md` | kleuren, type, spacing, voice |
| `styles.css` | adminlanding, topbar, buttons, borders, chips |
| `homepage.html` | mastheadverhoudingen en mobile nav |
| `article.html` | preview/artikeltypografie |
| `article-gate.html` | sheets, confirmflows, mobile focus |
| `subscribe.js` | chip/select/search interacties |

Keystatic zelf krijgt alleen officiële brand/navigationcustomization. Custom adminpagina's volgen de tokens volledig.
