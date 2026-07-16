# Design style — live tokens en typografische illustraties

Bron van waarheid voor de huidige publieke site: `apps/web/src/app/globals.css` en `apps/web/src/components/article-illustration.tsx`.

Dit document legt de tokens vast die we nu gebruiken, plus de typografische illustratiestijl als beeldvervanging. Open Design blijft referentie voor latere pixel-perfecte afstemming; deze waarden gelden tot die bron in de repo staat.

## Kleuren

### Oppervlakken (achtergrond)

| Token | Hex | Gebruik |
|-------|-----|---------|
| `--paper` | `#f5f0e6` | Pagina-achtergrond (warm papier) |
| `--paper-deep` | `#e8dece` | Hover, secundaire banden, subtiele vlakken |
| `--white` | `#fffdf8` | Licht vlak / tekst op donkere illustraties |
| `--ink` | `#171511` | Donkere vlakken (skip-link, sterke contrastzones) |

### Tekst

| Token | Hex | Gebruik |
|-------|-----|---------|
| `--ink` | `#171511` | Body, koppen, navigatie |
| `--ink-muted` | `#665f55` | Utilityregel, tagline, metadata, bijschriften |
| `--accent` | `#9f2f24` | Eyebrows, nadruk, focusring, CTA-accent (rood) |
| `--accent-dark` | `#702019` | Hover/pressed op accent |
| `--white` | `#fffdf8` | Tekst op donkere illustratievlakken |
| `--rule` | `#aaa092` | Hairlines, dividers (niet voor bodytekst) |

### Typografische illustratie — rotatiepalet

De typografische illustratie gebruikt een **donkere, verzadigde achtergrond** met lichte tekst. Achtergrondkleur roteert per artikel/kaart uit drie merkkleuren:

| Token (voorstel) | Hex | Rol | Tekstkleur op dit vlak |
|------------------|-----|-----|------------------------|
| `--illustration-green` | `#243f2c` | Huidige pitch-groen (behouden) | `--white` |
| `--illustration-red` | `#9f2f24` | Zelfde rood als `--accent` | `--white` |
| `--illustration-gold` | `#b8922a` | Warm stadium-goud / mosterd | `--ink` |

**Rotatieregel (product):** kies `green` | `red` | `gold` deterministisch per artikel (bijv. hash van slug mod 3), of laat redacteur kiezen in Keystatic. Goud gebruikt **inkttekst** voor WCAG-AA contrast; groen en rood gebruiken crème/wit.

Optioneel subtiel: de bestaande paper-grain overlays (`rgb(245 240 230 / …)`) blijven op alle drie de achtergronden.

## Typografie

| Rol | Familie (CSS) | Gebruik |
|-----|---------------|---------|
| Display / editorial | `--font-display`: Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif | Wordmark, hero-H1, artikelkoppen, illustratietitel |
| UI / body | `--font-ui`: Inter, system UI sans | Body, knoppen, formulieren, nav |
| Meta / labels | `--font-mono`: SFMono / Consolas / Liberation Mono | Utilitybar, eyebrows, illustratie-ondertitel, status |

Schaalrichting (live):

- Wordmark: `clamp(1.85rem, 8vw, 3.7rem)`, display, weight 700, tight tracking
- Hero / artikel H1: `clamp(2.55rem, 9vw, 5.8rem)`, display, weight 700
- Eyebrow: ~0.74rem, mono, uppercase, letter-spacing ~0.12em, kleur `--accent`
- Body: UI sans op `--ink`
- Illustratietitel: display italic, `clamp(3rem, 12vw, 7rem)`, weight 700

Layoutmaten:

- `--shell`: `1180px`
- `--article-measure`: `68ch`
- `--gutter`: `clamp(1rem, 4vw, 2rem)`

## Typografische illustratie (“Zondag langs de lijn”)

### Waarom

Geen stockfoto of lege grijze placeholder. Een **typografische illustratie** geeft sfeer, merk en context — vooral voor wedstrijdverslagen en lokale stukken zonder sterke foto.

Huidige defaultcopy:

- eyebrow: `Lokale verhalen`
- titel: `Zondag`
- hairline
- ondertitel: `langs de lijn`

Component: `ArticleIllustration` in `apps/web/src/components/article-illustration.tsx`.

### Wedstrijdvariant (gewenst)

Voor matchcontent mag de illustratie **clubnamen** dragen in plaats van de generieke slogan, zodat het blok relevant wordt:

**Voorbeeld**

```text
Lokale verhalen          (of reeks / “Wedstrijdverslag”)
KSV Aartselaar
────────
vs TOR Deurne Pirates
```

Of compact:

```text
KSV Aartselaar
vs
TOR Deurne Pirates
```

Richtlijnen:

- lange clubnamen mogen wrappen; geen ellipsis midden in een naam tenzij echt nodig;
- `vs` blijft klein / mono of muted, niet concurrerend met de clubnamen;
- optioneel reeks/kicker in de eyebrow (`3de provinciale A`, `P1 Antwerpen`, …);
- geen logo’s of badges in MVP — typografie alleen;
- `aria-label` beschrijft de wedstrijd voor screenreaders.

### Visuele regels

- volle bleed binnen het mediavlak; `border: 1px solid var(--ink)`;
- geen border-radius;
- subtiele grain / diagonale streep overlay (zoals nu);
- aspect-ratio ~4/3; compacte variant voor kaarten;
- achtergrond uit het rotatiepalet (groen / rood / goud);
- geen floating badges of promochips over het vlak.

### Contentmodel (later in Keystatic)

Velden voorstel:

- `illustrationMode`: `generic` | `match` | `custom`
- `illustrationTone`: `green` | `red` | `gold` (of auto)
- bij `match`: `homeTeam`, `awayTeam`, optioneel `competitionLabel`
- bij `custom`: korte displayregels (max 2–3 regels)

Zolang er geen foto is, is deze illustratie de **standaard hero** voor artikels.

## Wat dit niet is

- Geen vervanging van echte redactionele foto’s wanneer die er wél zijn.
- Geen PostHog-/marketingbadge-styling.
- Geen paarse/AI-default gradients; houd het bij papier, inkt, rood, pitch-groen en goud.

## Implementatiechecklist

- [x] Live tokens gedocumenteerd vanuit `globals.css`
- [x] Illustratiegroen `#243f2c` en accentrood `#9f2f24` vastgelegd
- [x] Derde rotatiekleur goud `#b8922a` gekozen
- [ ] CSS-modifiers `article-illustration--green|red|gold` in de app
- [ ] Matchvariant met clubnamen in component + contentmodel
- [ ] Deterministische of redactionele toonkeuze bij publiceren
