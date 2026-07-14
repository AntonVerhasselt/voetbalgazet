# Publieke UX en analytics

## Designbron

De visuele bron blijft de Open Design-prototypefolder:

```text
/Users/antonverhasselt/Library/Application Support/Open Design/namespaces/release-stable-intel/data/projects/a132ea15-213e-409f-9e25-e762711453c3
```

Te volgen bestanden:

- `homepage.html`: masthead, homepagefold en inline inschrijving;
- `article.html`: volledige artikeltypografie;
- `article-gate.html`: lead-in en bottom sheet;
- `subscribe.js`: stappen, teams en reeksen;
- `styles.css` en `brand-spec.md`: tokens, spacing, states en copytone.

Deze machine bevat de lokale prototypefolder niet. Vóór implementatie moeten de ontwerpen/assets in de repository of een gedeelde toegankelijke map worden geplaatst, zodat exacte spacing, responsive states en interacties controleerbaar zijn. De onderstaande flowbeslissingen hebben voorrang op oudere prototypegedragingen zoals “Niet nu”.

De map is opnieuw geprobeerd te lezen vanuit de cloudomgeving en blijft onbeschikbaar. Kopieer haar naar `design/open-design/`. De gedeelde mobile-first regels en acceptatiematrix staan in [`../ui-ux/`](../ui-ux/).

## Mobile-first basis

- Ontwerp eerst op 360 px, valideer 320 en 390 px vóór desktop.
- Mobiele homepage is één kolom; desktopkolommen zijn progressive enhancement.
- Tap targets minimaal 44 × 44 px.
- Bodytekst artikel 17–18 px met ruime line-height.
- Horizontale padding 16–20 px.
- Beelden hebben responsieve bronnen en vaste dimensies tegen layout shift.
- Geen hover-only navigatie, filters of shareacties.
- Sticky UI respecteert safe-area en bedekt nooit content/keyboard.
- Performance en Core Web Vitals worden primair met mobiel profiel beoordeeld.

## Homepage

Mobiele volgorde, gebaseerd op `homepage.html`:

1. Compacte masthead met logo, mobile menu/search en prominente “Abonneren”-CTA.
2. Hoofdverhaal als één grote kaart.
3. “Het laatste” als scanbare lijst.
4. Redactionele secties per reeks/categorie, één kolom.
5. Inline abonnementsmodule met dezelfde flow als de gate.
6. Footer met privacy, voorwaarden en support; geen account/login/logoutlinks.

Op desktop mag dit uitbreiden naar het krantengrid uit het prototype, maar leesvolgorde en headings blijven semantisch gelijk.

De site is statisch en niet gepersonaliseerd. Subscriberstatus verandert alleen:

- CTA-copy/status waar nuttig;
- zichtbaarheid van gates op artikelpagina's;
- toegang tot voorkeuren via veilige e-maillink.

## Gated artikel

### Zonder leessessie

1. Toon headline, dek, beeld, byline en 2–3 alinea's.
2. Plaats vaste visuele overgang naar de sheet.
3. Sheet kan niet gesloten, weggeswipet of met Escape gedismissed worden.
4. Primaire actie: nieuwe inschrijving.
5. Secundaire inline actie: **“Al abonnee? Lees meteen verder.”**

Mobiel:

- sheet gebruikt de breedte en waar nodig vrijwel de volledige hoogte;
- CTA en fouten blijven boven het virtuele keyboard;
- focus trap en scroll locking worden op iOS/Android getest;
- voorkeurenchips wrappen zonder horizontale overflow;
- clubsearch en resultaten zijn full-width;
- gated lead-in blijft zichtbaar genoeg om context te behouden.

Voorgestelde primaire copy:

> **Abonneer om verder te lezen**<br>
> Dit artikel is gratis, maar je hebt een abonnement op De Voetbalgazet nodig om het volledig te lezen. Eén e-mail per week — lokaal voetbal, geen ruis.

### Primaire inschrijfflow

**Stap 1 — E-mail**

- enkel e-mailveld;
- formatvalidatie client + server;
- CTA “Ga verder”;
- privacy/voorwaarden duidelijk bereikbaar;
- geen melding of adres al bestaat.

**Stap 2 — Voorkeuren voor nieuw adres**

- minstens één reeks;
- maximaal één optionele club;
- zoekbare clubpicker;
- CTA “Abonneer en lees verder”;
- volledige gecombineerde consentcopy direct bij CTA.

**Stap 3 — Succes**

- artikel ontgrendelt zonder paginareload;
- compacte bevestiging “Welkom bij De Voetbalgazet”;
- meldt dat een welkomstmail onderweg is;
- geen extra “check je inbox om te lezen”.

### Bestaand adres

- onmiddellijk reader-session en artikelunlock;
- geen voorkeuren opnieuw;
- generieke melding over eventuele veilige bevestigingsmail;
- opgeslagen voorkeuren nooit tonen vóór verificatie.

### Geldige sessie

- gate wordt nooit gemount/getoond nadat sessiestatus bekend is;
- tijdens sessiecheck een layout-stabiele placeholder, geen korte gateflits;
- reader en verifiedSubscriber krijgen dezelfde artikelweergave.

## Inline homepage-inschrijving

- Dezelfde backendactie, states, validatie en consentcopy als de article gate.
- Na succes blijft gebruiker op de homepage.
- CTA kan wijzigen naar “Je bent geabonneerd” wanneer de sessie dit lokaal bevestigt.
- Inschrijving is niet nodig om headlines/homepage te bekijken.

## Voorkeurenpagina

- Alleen via veilige link uit nieuwsbrief of magic link.
- Geen algemene navigatielink.
- Toon geselecteerde reeksen en één club.
- Opslaan met duidelijke success-state.
- Nieuwsbrief uitschrijven is niet dezelfde actie en staat in e-mailfooter.
- Bij verlopen identity-session verschijnt dezelfde compacte e-mailverificatiesheet.
- Op mobiel staan reeksen per provincie in accordions/chipgroepen en blijft opslaan als sticky veilige actie zichtbaar.

## Archief en zoeken

- Mobiel list cards, geen brede tabel.
- Filters openen in een sheet/drawer.
- Actieve filters verschijnen als verwijderbare chips.
- Result count en Reset zijn altijd zichtbaar.
- Bij sluiten keert focus terug naar de filterknop.
- Search input gebruikt 16 px tekst om ongewenste iOS-zoom te voorkomen.

## Toegankelijkheid

- Sheet gebruikt semantische dialog/bottom-sheettechniek en correcte focus trap.
- Focus gaat naar heading en daarna eerste veld.
- Foutmeldingen gekoppeld via `aria-describedby` en live region.
- Toetsenbordbediening voor provincie-tabs, chips en autocomplete.
- Voldoende contrast en zichtbare focus.
- Gate mag niet alleen via blur communiceren dat inhoud vergrendeld is.
- `prefers-reduced-motion` respecteren.
- Afbeeldingen hebben betekenisvolle alttekst; decoratieve beelden lege alt.

## PostHog-strategie

### Privacykeuze

Gebruik PostHog Cloud EU met:

- cookieless mode als publieke default;
- IP-capture uit;
- geen raw e-mail, naam, magic token, URL-token of subscriber-ID in events;
- geen autocapture van formuliervelden;
- URL sanitization vóór capture;
- property allowlist in plaats van alles blind vastleggen;
- eventretentie van 24 maanden;
- session replay standaard uit.

Implementatiepad voor MVP:

- PostHog JS in publieke en custom-admin browserroutes;
- cookieless publieke events naar het EU-project;
- geen `@convex-dev/posthog` component voor gewone browserfunnels;
- Convex/Resend deliveryevents blijven in Convex en worden alleen geaggregeerd in de e-mailadmin;
- server-side PostHog-events worden pas toegevoegd wanneer een concreet event niet betrouwbaar client-side kan worden gemeten.

Een e-mailhash is nog steeds pseudonieme persoonsgegevens en kan worden aangevallen met woordenlijsten. Daarom is **geen e-mailhash** de standaard. Als later cross-device analytics noodzakelijk is, gebruik dan een willekeurige analytics-ID of HMAC met geheime salt, documenteer de rechtsgrond en geef de gebruiker de vereiste keuze.

Strictly necessary Better Auth-cookies vereisen geen analyticsconsent omdat ze toegang leveren die de gebruiker expliciet vraagt. Niet-noodzakelijke PostHog-cookies en session replay vereisen een aparte consentflow; ze mogen niet stilzwijgend in de nieuwsbriefinschrijving worden gebundeld.

### Waarom niet “alles automatisch”

“Zoveel mogelijk” betekent hier: elke relevante productbeslissing meetbaar maken, niet persoonsgegevens of tekstvelden onbeperkt verzamelen. Cookieless events geven voldoende funnel-, content- en UX-inzicht zonder een invasief profiel.

## Eventtaxonomie

Gebruik vaste lower_snake_case namen en een version property.

`article_id` is voor het MVP gelijk aan de canonieke, na eerste publicatie immutable slug. Een uitzonderlijke slugmigratie vereist redirect- en analyticsmapping. Taxonomieproperties gebruiken stabiele `division_key`, `team_key`, `category_key` en `author_key`, nooit veranderlijke labels als primaire ID.

### Navigatie/content

| Event | Wanneer | Veilige properties |
|-------|---------|---------------------|
| `public_page_viewed` | Publieke route zichtbaar | `page_type`, `path_template`, `referrer_domain`, `utm_*`, `device_type` |
| `article_viewed` | Artikel geladen | `article_id`, `slug`, `category`, `division`, `is_gated`, `access_level` |
| `article_lead_reached` | Lead-in volledig gezien | `article_id`, `lead_percent` |
| `article_body_unlocked` | Gate weg / body zichtbaar | `article_id`, `unlock_source`, `access_level` |
| `article_read_depth_reached` | 25/50/75/100% | `article_id`, `depth`, `access_level` |
| `article_share_clicked` | Deelactie | `article_id`, `channel` |
| `search_opened` | Zoek-UI open | `source_page` |
| `search_performed` | Query ingediend | `query_length`, `result_count` — nooit querytekst |
| `search_result_clicked` | Resultaat gekozen | `article_id`, `position` |

### Gate en signup

| Event | Wanneer | Veilige properties |
|-------|---------|---------------------|
| `gate_impression` | Gate zichtbaar | `article_id`, `gate_variant`, `lead_length` |
| `gate_email_started` | Eerste interactie | `article_id`, `source` |
| `gate_email_submitted` | Geldig format verstuurd | `article_id`, `source`; geen e-mail |
| `gate_email_rejected` | Validatiefout | `error_code`, `source` |
| `preferences_step_viewed` | Nieuwe inschrijving | `source` |
| `division_selected` | Reeks toggled | `province`, `division`, `selected_count` |
| `team_search_used` | Club gezocht | `query_length`, `result_count`; geen tekst |
| `favorite_team_selected` | Club gekozen | `team_id`, `province` |
| `subscription_submitted` | Final CTA | `source`, `division_count`, `has_team`, `consent_version` |
| `subscription_succeeded` | Backend success | `source`, `access_level`, `is_returning_flow` |
| `subscription_failed` | Backend failure | `source`, `error_code`, `step` |
| `welcome_link_opened` | Veilige callback | `link_type`, `token_age_bucket`; geen token |
| `subscriber_session_verified` | Identity gekoppeld | `source`, `was_anonymous` |

### Nieuwsbrief en voorkeuren

| Event | Wanneer | Properties |
|-------|---------|------------|
| `newsletter_article_link_opened` | Bootstrap geslaagd | `article_id`, `campaign_analytics_id` — opaque, geen Convex/recipient-ID |
| `newsletter_unsubscribed` | Status gewijzigd | `campaign_analytics_id`, `reason_code?` |
| `preferences_viewed` | Geverifieerde pagina | `division_count`, `has_team` |
| `preferences_updated` | Opslaan geslaagd | `division_count`, `has_team` |

### Techniek en UX

| Event | Wanneer | Properties |
|-------|---------|------------|
| `auth_session_check_completed` | Sessiestatus bekend | `duration_bucket`, `access_level`, `cache_hit?` |
| `auth_link_failed` | Callback faalt | `error_code`, `link_type` |
| `article_render_error` | Body/gate faalt | `article_id`, `error_code` |
| `web_vital_measured` | CWV sample | `metric`, `rating`, `value_bucket`, `page_type` |

## Kernfunnels en dashboards

1. **Gate conversion:** `gate_impression` → `gate_email_submitted` → `preferences_step_viewed` → `subscription_succeeded` → `article_body_unlocked`.
2. **Returning flow:** gate → existing email submit → immediate unlock → verificationlink geopend.
3. **Homepage signup:** inline impression → email → preferences → success.
4. **Content engagement:** article view → lead reached → unlock → 50% → 100%.
5. **Newsletter:** campaign click → verified session → article unlock → read depth.
6. **Reliability:** signup/auth failures per code, browser, device en release.

Breakdowns:

- artikel, categorie, reeks;
- gate versus homepage;
- referrer/UTM/campaign;
- mobiel/desktop en browser;
- nieuwe reader versus verifiedSubscriber;
- gated versus vrij artikel.

## Session replay

Niet in het MVP zonder aparte analyticsconsent. Als later geactiveerd:

- expliciete, afzonderlijke cookie/analyticskeuze;
- alle inputvelden maskeren;
- tekst en afbeeldingen met persoonsgegevens blokkeren;
- sampling alleen op relevante fouten/gatefrictie;
- retention minimaliseren;
- privacyverklaring bijwerken.

## Acceptatiecriteria

- Geen event bevat raw e-mail, formulierinput of token.
- Signupfunnel werkt voor gate en homepage.
- Events worden niet dubbel verstuurd bij React rerenders.
- Newslettercallback sanitizet URL vóór pageview.
- PostHog EU en IP-capture uit zijn geverifieerd.
- Dashboardfilters gebruiken stabiele IDs, niet veranderlijke titels.
