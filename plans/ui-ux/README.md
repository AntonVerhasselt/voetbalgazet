# Gedeelde UI/UX — mobile first

Dit dossier geldt voor:

- publieke nieuwssite;
- Keystatic/contentadmin;
- custom nieuwsbriefadmin;
- gerenderde e-mails.

| Document | Inhoud |
|----------|--------|
| [01-design-style.md](./01-design-style.md) | Live kleuren, typografie en typografische illustraties (“Zondag langs de lijn”, wedstrijdvariant, rotatiepalet groen/rood/goud) |

## Designbron en beschikbaarheid

Bronpad:

```text
/Users/antonverhasselt/Library/Application Support/Open Design/namespaces/release-stable-intel/data/projects/a132ea15-213e-409f-9e25-e762711453c3
```

Verwachte bronbestanden:

| Bestand | Gebruik |
|---------|---------|
| `brand-spec.md` | kleur-, type-, spacing- en tone-of-voicebron |
| `styles.css` | tokens en bestaande componentstates |
| `homepage.html` | masthead, hero, laatste nieuws, inschrijfmodule |
| `article.html` | artikeltypografie, beeld, pull quote, bodyritme |
| `article-gate.html` | lead-in, blur/overgang, mobile bottom sheet |
| `subscribe.js` | preference-stappen, chips, search en validatie |
| `mr9gvna8-image.png` | logo/beeldreferentie volgens bestaand plan |

De map is lokaal op de computer van de eigenaar en was opnieuw niet beschikbaar in de cloudomgeving. Daarom:

1. kopieer relevante bron en assets naar `design/open-design/`;
2. voeg screenshots voor mobile/desktop states toe;
3. controleer daarna alle tokens en maatvoering;
4. behandel bestaande tekstuele beschrijvingen tot dan als richtinggevend, niet pixel-perfect.

## Mobile-first volgorde

Ontwerp en test in deze volgorde:

1. 360 px als primaire ontwerpviewport;
2. 320 px minimum;
3. 375/390 px moderne telefoons;
4. 768 px tablet;
5. 1024/1280+ desktop.

Desktop is een verrijking van dezelfde flows, geen apart product.

## Gedeelde principes

### Visueel

- warm papier `#f5f0e6`, dieper papier `#e8dece`;
- inkt `#171511`, muted `#665f55`;
- accentrood `#9f2f24` (en dark `#702019`);
- serif display (Iowan Old Style / Georgia-stack) voor editoriale titels;
- Inter/system sans voor UI/formulieren;
- monospace voor metadata/status;
- hairline rules (`#aaa092`);
- geen overmatig afgeronde cards;
- typografische illustraties als default beeldvervanging — zie [`01-design-style.md`](./01-design-style.md);
- illustratie-achtergronden roteren groen `#243f2c` / rood `#9f2f24` / goud `#b8922a`;
- ruime maar niet verspillende mobile spacing;
- paper grain alleen decoratief en performance-safe.

Exacte live tokens staan in [`01-design-style.md`](./01-design-style.md) (afgeleid van `apps/web/src/app/globals.css`). Open Design `brand-spec.md`/`styles.css` blijft latere pixel-perfecte afstemming.

### Interactie

- minimaal 44 × 44 px tap targets;
- geen hover-only informatie of acties;
- primaire actie binnen duimbereik;
- sheets/drawers op mobiel, sidebars op desktop;
- sticky controls respecteren safe-area insets;
- virtual keyboard mag CTA/fout niet verbergen;
- loading houdt layout stabiel;
- fouten dichtbij het veld én in live region;
- destructive confirm beschrijft exact gevolg.

### Toegankelijkheid

- WCAG AA contrast;
- semantic HTML;
- keyboardbediening;
- zichtbare focus;
- status niet alleen kleur;
- reduced motion;
- 200% zoom zonder functieverlies;
- screen-reader labels;
- betekenisvolle alttekst;
- focus management voor sheets/modals.

## Publieke site

### Mobile masthead

Gebaseerd op `homepage.html`:

- compacte logozone;
- één duidelijke subscribeactie;
- zoeken/menu als grote iconbutton met tekstlabel voor screen readers;
- geen brede desktopnav gepropt op mobiel;
- hairline divider.

### Homepage

Mobiele volgorde:

1. masthead;
2. hoofdverhaal;
3. laatste nieuws;
4. redactionele secties;
5. inline inschrijving;
6. footer.

Cards worden één kolom. Beeldverhouding en width/height voorkomen CLS. Headline blijft dominant; metadata kort en scanbaar.

### Artikel

Gebaseerd op `article.html`:

- body 17–18 px;
- line-height circa 1.65;
- 16–20 px horizontale padding;
- headline schaalt met `clamp`;
- dek visueel los;
- beelden full-bleed alleen bewust en zonder horizontale overflow;
- captions/credits 12–13 px maar voldoende contrast;
- shareacties grote targets;
- geen sticky elementen die tekst bedekken.

### Gate

Gebaseerd op `article-gate.html`:

- op mobiel bottom sheet/full-height sheet;
- headline en eerste inhoud blijven zichtbaar;
- focus op sheetheading/eerste veld;
- CTA boven keyboard;
- minstens één reeks selecteren zonder horizontale chaos;
- clubsearch full-width;
- sheet niet dismissable volgens productbeslissing;
- sessiecheck veroorzaakt geen gateflits.

### Archief en zoeken

- filters als mobile sheet;
- actieve filters als verwijderbare chips;
- result count;
- reset;
- URL/query state waar nuttig;
- list cards, geen brede tabel;
- pagination/load more met focusbehoud.

## Newsletteradmin

### Mobile landing/list

- status tabs horizontaal scrollbaar of select;
- campagne als compacte row/card;
- subject, status, datum en count;
- primaire `Nieuwe e-mail`-CTA;
- duplicate/send nooit op hover;
- swipe-acties vermijden.

### Mobile editor

- canvas één kolom;
- block toolbar sticky/bottom sheet;
- inspector als drawer;
- subject en verplichte preheader boven canvas;
- uploadprogress inline;
- undo/redo bereikbaar;
- autosavestatus persistent;
- preview wisselt tussen editor en 360 px output;
- geen miniatuur-desktopcanvas als enige editmode.

### Audience/send

- filters in accordion/sheet;
- audienceomschrijving in gewone taal;
- count groot en duidelijk;
- finale confirm scrollt niet voorbij gevolgen;
- scheduling gebruikt locale date/time en `Europe/Brussels`;
- results cards eerst, detailtabel als responsive list.

## Keystatic/contentadmin

- custom adminlanding volgt volledige design tokens;
- Keystatic gebruikt officiële `ui.brand` en navigation;
- `entryLayout: "content"`;
- metadata sidebar wordt mobile drawer/stack;
- preview mobile-first;
- publishstatus duidelijk;
- GitHub/commit/buildtermen worden in eenvoudige redactionele copy uitgelegd;
- Keystatic UI op echte telefoons testen; geen aanname op basis van desktopbrowser resize alleen.

## E-mails

E-mailontwerp is eveneens mobile-first:

- ontwerp/preview eerst op 320–375 px;
- één kolom als default;
- desktop max-width 600–640 px;
- body minimaal 16 px;
- line-height 1.5–1.65;
- links/buttons minimaal circa 44 px hoog;
- 16–20 px mobile padding;
- beelden `display:block`, responsief en met width/height;
- geen hoverafhankelijkheid;
- complexe kolommen alleen als stacking getest is;
- dark-modeveilige kleurkeuzes;
- plaintextvariant;
- verplichte preheader;
- HTML-grootte bewaken om Gmail clipping rond 102 KB te vermijden;
- vaste footer met `Uitschrijven` en `Voorkeuren aanpassen` blijft mobiel leesbaar.

## Performancebudget publieke site

Mobile productieprofiel als primaire meting:

| Metric | Doel |
|--------|------|
| LCP | ≤ 2,5 s p75 |
| INP | ≤ 200 ms p75 |
| CLS | ≤ 0,1 p75 |
| Publieke client-JS | zo klein mogelijk; gate/search alleen waar nodig |
| Hero image | juiste mobiele `srcset`, compressed, width/height |
| Fonts | beperkte weights, preload alleen kritisch, goede fallbacks |

Test op tragere mobiele CPU/netwerkprofielen, niet alleen snelle desktop.

## UX-acceptatiematrix

Iedere belangrijke flow wordt getest op:

- 320 × 568;
- 360 × 800;
- 390 × 844;
- 768 × 1024;
- desktop;
- touch;
- keyboard;
- screen reader smoke;
- 200% zoom;
- reduced motion;
- slow network;
- error/retry state.

Flows:

- homepage naar artikel;
- gate signup;
- returning subscriber;
- preferences;
- unsubscribe;
- archive/search;
- artikel schrijven/preview/publish;
- nieuwsbrief maken/preview/test/send;
- transactionele e-mail Admin-edit;
- image upload;
- sendresultaten.
