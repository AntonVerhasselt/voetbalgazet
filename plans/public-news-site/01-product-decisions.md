# Bevestigde productbeslissingen

## Positionering

- De site is Nederlandstalig en richt zich op lokaal voetbal in Vlaanderen.
- Mobile is de primaire ontwerp- en acceptatiecontext; desktop verrijkt dezelfde flows.
- Alle publieke pagina's en artikels zijn statisch en voor elke bezoeker inhoudelijk gelijk.
- Volledige artikels zijn gratis, maar vereisen een abonnement op De Voetbalgazet.
- Een eerste inschrijving omvat website-toegang én de wekelijkse nieuwsbrief.
- `siteAccess` en `newsletterSubscribed` zijn technisch aparte statussen.
- Uitschrijven uit de nieuwsbrief trekt website-toegang niet in.

## Routes

| Route | Type | Beslissing |
|-------|------|------------|
| `/` | Statisch | Homepage met inline inschrijfflow |
| `/archief` | Statisch | Artikelarchief met categorie-, provincie-, reeks-, club- en datum/jaarfilters |
| `/nieuws/[slug]` | Statisch + client gate | Artikel, lead-in en verplichte gate |
| `/voorkeuren` | Statisch shell + geverifieerde sessie | Alleen bereikbaar via veilige nieuwsbrief-/magic-link; geen accountdashboard |
| `/email/artikel` | Same-origin server callback | Wisselt 30-dagen article token in en redirect 303 naar canonieke artikel-URL |
| `/email/voorkeuren` | Same-origin server callback | Wisselt preferences token in en redirect naar `/voorkeuren` |
| `/uitschrijven` | Publieke bevestigingspagina | Scanner-safe GET; muteert niet zonder bevestigende POST |
| `/api/email/uitschrijven` | Server POST | Zichtbare confirm en RFC 8058 one-click unsubscribe |
| `/preview/start`, `/preview/end` | Admin-only serverroutes | Better Auth + signed/allowlisted Keystatic draft-mode preview; `noindex`, no-cache |
| `/privacy` | Statisch | Privacyverklaring |
| `/voorwaarden` | Statisch | Gebruiksvoorwaarden en wettelijke vermeldingen |

Niet bouwen:

- geen `/abonneren`;
- geen zelfstandige `/inloggen`;
- geen publieke accountpagina;
- geen zichtbare uitlogfunctie;
- geen gepersonaliseerde homepage;
- geen gepersonaliseerde artikelvolgorde.

Login en inschrijving bestaan uitsluitend:

1. in de verplichte artikelsheet;
2. in de inline inschrijfmodule op de homepage;
3. via veilige links in e-mails.

## Inschrijving

- Na e-mail + voorkeuren krijgt een nieuwe lezer **onmiddellijk toegang**.
- Geen wachtpagina en geen verplichte double opt-in vóór toegang.
- De welkomstmail bevat een verificatie-/magic link en kan het huidige of een ander apparaat koppelen aan de geverifieerde subscriber.
- Een fout getypt e-mailadres mag op het huidige apparaat blijven lezen via de lokale leessessie; de nieuwsbrief zal niet aankomen en de identiteit blijft ongeverifieerd.
- De eerste inschrijving vereist minstens één reeks/afdeling.
- Favoriete club is optioneel en beperkt tot maximaal één club.
- Een reeds geverifieerde subscriber krijgt de voorkeurenstap niet opnieuw te zien.
- De knop en begeleidende tekst moeten ondubbelzinnig zeggen dat klikken zowel artikeltoegang als de wekelijkse nieuwsbrief activeert.

Voorgestelde consentcopy:

> Door op **‘Abonneer en lees verder’** te klikken, abonneer je je op De Voetbalgazet. Je krijgt toegang tot alle artikels en ontvangt onze wekelijkse nieuwsbrief. Je kunt de nieuwsbrief op elk moment uitschrijven zonder je toegang tot de site te verliezen. Lees onze [privacyverklaring](/privacy) en [voorwaarden](/voorwaarden).

Deze ene duidelijke knop is de bevestigende handeling; er is geen vooraf aangevinkte checkbox en geen tweede opt-in.

## Sessies en apparaten

- Sessieduur: 90 dagen.
- Sliding renewal: actieve lezers krijgen opnieuw 90 dagen volgens de ingestelde refresh-cadans.
- Geen “Onthoud mij”; iedereen krijgt hetzelfde venster.
- Onbeperkt aantal apparaten.
- Geen zichtbare uitlogknop in de publieke UI.
- Een bekende e-mail op een nieuw apparaat geeft onmiddellijk alleen **leestoegang**, geen bewezen identiteit.
- Deze returning flow verandert nooit bestaande voorkeuren of nieuwsbriefstatus en schrijft een uitgeschreven lezer niet opnieuw in.
- Een magic link of veilige nieuwsbrief-link promoveert die sessie naar een geverifieerde subscribersessie.

## Newsletterlinks

- Artikelknoppen in de wekelijkse nieuwsbrief openen onmiddellijk het volledige artikel.
- De link bevat een opaque, ondertekend bootstrap-token zonder e-mailadres of subscriber-ID in leesbare vorm.
- De callback wisselt het token in voor een 90-dagensessie en redirect meteen naar de canonieke artikel-URL zonder token.
- Newsletterstatus en siteAccess blijven apart: een voormalige nieuwsbriefsubscriber met actieve siteAccess mag nog steeds via een geldige toegangslink of sessie lezen.
- Forwarding van een nieuwsbrief kan tijdelijk toegang geven aan de ontvanger van de doorgestuurde link. Voor een gratis registratiegate is dit een aanvaard MVP-risico; het token krijgt wel een vervaldatum en kan worden ingetrokken.

## Gate

- Geen “Niet nu” of andere dismiss-optie.
- De sheet is verplicht zolang er geen geldige leessessie is.
- “Al abonnee?” wordt direct maar secundair onder het primaire formulier getoond.
- Bij een geldige sessie wordt de gate nooit getoond.
- Homepage-inline en artikelsheet gebruiken dezelfde formulierlogica, validatie, consentcopy en analytics.
- De exacte visuele uitvoering volgt `homepage.html`, `article-gate.html`, `styles.css` en `subscribe.js` uit de Open Design-map.

## Voorkeuren

- Voorkeuren beïnvloeden alleen nieuwsbriefselectie/segmentatie.
- De publieke site blijft voor iedereen identiek.
- Een geverifieerde subscriber kan voorkeuren aanpassen via een link in de nieuwsbrief.
- Een geverifieerde uitgeschreven subscriber kan daar met een aparte expliciete CTA opnieuw inschrijven; complaint/hard-bounce suppression wordt nooit automatisch opgeheven.
- Wijzigen vereist geverifieerde identiteit; een laaggeprivilegieerde leessessie is onvoldoende.
- Minstens één reeks blijft verplicht.
- Eén favoriete club is optioneel.

## Artikels en distributie

- Redacteuren krijgen een `isGated`-flag per artikel.
- `isGated: false` publiceert een volledig vrij artikel zonder sheet.
- Gated artikels tonen publiek minstens headline, dek/intro, hoofdbeeld, byline, datum, leestijd en eerste 2–3 alinea's.
- RSS is publiek en bevat metadata + lead-in/excerpt + canonieke link, niet de volledige gated tekst.
- Leesvoortgang (“ga verder waar je stopte”) is begrepen als het onthouden van de laatste scrollpositie. Dit is **geen MVP-functionaliteit**.
- Initiële categorieën: `Wedstrijdverslagen`, `Transfernieuws`, `Interviews`, `Analyse`, `Jeugd` en `Clubnieuws`.
- `/archief` filtert op categorie, provincie, reeks, club en datum/jaar; filters werken client-side op de statische index en zijn combineerbaar.
- Publieke zoekresultaten indexeren alleen headline, dek, auteur, kicker/reeks en publieke lead-in — nooit de gated body.
- Club- en reeksgegevens komen later uit officiële Voetbal Vlaanderen-data. Het MVP toont geen standen, wedstrijden, clubpagina's of andere losse VV-data; de data wordt alleen gebruikt als artikelmetadata en voor de inschrijfvoorkeuren.

## Juridisch en data

- Geen double opt-in.
- Eén gecombineerde, expliciete inschrijfactie; nieuwsbrief is onderdeel van de initiële propositie.
- Elke nieuwsbrief bevat een duidelijke gratis uitschrijflink.
- Uitschrijven zet alleen `newsletterSubscribed = false`; `siteAccess` blijft behouden.
- Subscriberdata wordt bewaard zolang de website-toegang actief is of tot een geldig verwijderverzoek.
- Verwijderverzoeken verlopen via support.
- Inactieve siteAccess-profielen blijven bestaan zolang toegang actief is; geen automatische verwijdering alleen wegens inactiviteit.
- Beveiligings- en foutlogs: 90 dagen.
- PostHog analytics: 24 maanden.
- Supportcorrespondentie: 24 maanden.
- Juridische review vóór lancering wordt aanbevolen, maar is geen technische launch blocker.
- Privacy- en voorwaardenpagina zijn vereist vóór lancering.

## Analytics

- PostHog is de enige productanalyticsoplossing.
- Meet de volledige publieke funnel en zoveel mogelijk nuttige interacties, maar verzamel geen ruwe e-mailadressen.
- Gebruik PostHog Cloud EU, IP-capture uit en privacyvriendelijke defaults.
- Zie [`04-public-ux-and-analytics.md`](./04-public-ux-and-analytics.md) voor events, properties en consentgrenzen.

## Niet meer open

De volgende eerdere vragen zijn hiermee afgesloten:

- onmiddellijke toegang versus wachten op verificatie;
- sessieduur en remember-me;
- onbeperkte apparaten;
- newsletter deep-link login;
- gate dismiss;
- team/reeksminimum;
- account- en loginroutes;
- ungated-artikelflag;
- publiek RSS-model;
- scheiding nieuwsbriefstatus en website-toegang.

## Laatste bevestigingen

- Artikelroute: `/nieuws/[slug]`.
- De technisch omzeilbare volledig statische soft gate is aanvaard als bewuste MVP-trade-off.
- Het zwakke subscriber-membershipsignaal door voorkeuren voor bekende adressen over te slaan is aanvaard, met generieke responses en rate limiting als mitigatie.

Bedrijfs-, KBO- en contactgegevens zijn bewust uitgesteld en staan als launchtodo in [`06-launch-todos.md`](./06-launch-todos.md).
