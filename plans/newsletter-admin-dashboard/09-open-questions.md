# Open vragen, aanbevelingen en standaardbeslissingen

## Werkwijze

Elke vraag bevat een **aanbevolen standaard**. Als er geen antwoord komt, wordt die keuze gebruikt bij implementatie. Een expliciet antwoord vervangt de standaard en moet in `01-product-decisions.md` worden verwerkt.

## Beantwoorde basisbeslissingen en resterende launchblockers

### 1. Domein en afzenderadressen — bevestigd

**Beslissing**

- publiek domein: `devoetbalgazet.be`;
- sending domain: `nieuws.devoetbalgazet.be`;
- From name: `De Voetbalgazet`;
- één primaire divisie: `{{division-slug}}@nieuws.devoetbalgazet.be`;
- meerdere divisies of volledig publiek: `redactie@nieuws.devoetbalgazet.be`;
- Reply-To: `redactie@devoetbalgazet.be`;
- transactioneel: `redactie@nieuws.devoetbalgazet.be`.

Divisies gebruiken een stabiele ASCII-slug in het adres. Het zichtbare From name is `De Voetbalgazet — {{Divisionnaam}}` bij één divisie en `De Voetbalgazet` bij meerdere/alle divisies.

SPF, DKIM en DMARC voor `nieuws.devoetbalgazet.be` blijven production launchchecks.

---

### 2. Welke fysieke en juridische gegevens moeten in de footer? — uitgesteld

**Aanbevolen standaard**

Gebruik de maatschappelijke zetel of juridisch goedgekeurde redactionele contactlocatie plus:

- juridische naam;
- fysiek adres;
- redactieadres;
- privacy- en voorwaardenlink;
- verantwoordelijke uitgever waar vereist.

**Waarom**

Een marketingfooter en Belgische publicatie hebben echte identiteits-/contactgegevens nodig. Placeholders mogen nooit live gaan.

**Nog nodig vóór live verzending**

Juridische naam, adres, contactadres en verantwoordelijke uitgever zodra beschikbaar.

**Huidige beslissing**

Technische implementatie mag doorgaan met duidelijk gemarkeerde placeholders; live send blijft geblokkeerd.

---

### 3. Open- en clicktracking — bevestigd

**Beslissing**

- activeer alle door Resend ondersteunde campaigntracking;
- opens en clicks aan;
- delivery, bounce, complaint, delayed en failure altijd verwerken;
- first-party article callbacks blijven het sterkere redactionele signaal;
- opens blijven als indicatief gelabeld;
- auth-, preference- en unsubscribe-clicks tellen niet als redactionele engagement;
- privacyverklaring beschrijft dit expliciet.

---

### 4. Schaaldoel — bevestigd

Er is geen productlimiet van 100.000 subscribers.

Ontwerp en test initieel voor minstens **100.000 subscribers**:

- alle lijsten gepagineerd;
- recipient snapshot in batches;
- indexed segmentatie;
- geen `collect()` op de volledige lijst;
- resumable workers.

Het systeem blijft daarboven werken binnen actuele Convex-/Resendquotas; vóór een materieel grotere schaal worden loadtest, concurrency en providerquota opnieuw gevalideerd.

---

## Productvragen met aanbevolen default

### 5. Mag een Journalist zelfstandig live verzenden? — bevestigd

**Beslissing**

Ja. `admin` en `journalist` mogen maken, testen, plannen en verzenden; `viewer` is read-only. Elke send vereist finale typed confirm en audit.

**Waarom**

Dit past bij een kleine redactie en het bestaande rollenplan. Een verplichte tweede approver maakt solo-operatie onmogelijk.

**Alternatief**

Voeg later `publisher` capability toe wanneer er meerdere redacteurs zijn en functiescheiding gewenst is.

---

### 6. Moeten geplande sends al in de eerste release?

**Aanbevolen standaard**

Ja, als onderdeel van de launch-MVP, naast Send nu.

**Waarom**

Een wekelijkse nieuwsbrief wordt betrouwbaarder wanneer redactie vooraf kan klaarzetten. Het plan voorziet veilige interne scheduling, cancel en DST.

**Alternatief**

Fase 8 uitstellen en launchen met alleen Send nu vermindert scope zonder het datamodel te breken.

**Bij geen antwoord**

Scheduling wordt gebouwd vóór publieke launch.

---

### 7. Moet de inhoud per subscriber gepersonaliseerd worden?

**Aanbevolen standaard**

Nee in MVP. Voorkeuren beperken alleen de doelgroep; alle ontvangers van één send krijgen dezelfde body.

**Waarom**

Per-persoonblokken vermenigvuldigen render-, preview-, test- en redactionele complexiteit. Eerst moet betrouwbare segmentatie en delivery staan.

**Bij geen antwoord**

Geen contentpersonalisatie; architectuur houdt per-recipient rendering voor veilige links wel mogelijk.

---

### 8. Wat betekent filteren op meerdere reeksen en clubs?

**Aanbevolen standaard**

- OR binnen reeksen;
- OR binnen clubs;
- AND tussen reeks en club.

Voorbeeld: `(P1 OF P2) EN (Club A OF Club B)`.

**Waarom**

Dit is voorspelbaar, uitlegbaar en past bij gangbare audiencebuilders.

**Bij geen antwoord**

Gebruik deze vaste logica; geen vrije boolean builder.

---

### 9. Transactionele e-mails visueel bewerken — bevestigd

Welcome, magic link, verificatie en andere dienstmails worden in dezelfde editor via het adminplatform beheerd.

Veiligheidsgrenzen:

- typed allowed/required systeemvariabelen;
- secrets/tokens pas server-side invullen;
- immutable versies en één actieve gepubliceerde versie;
- preview met dummydata;
- verplichte succesvolle test vóór publicatie.

---

### 10. Succesvolle testmail verplicht — bevestigd

Ja, minstens één succesvolle test op exact dezelfde revision, senderconfig en linkconfig. Wijzigingen maken de test ongeldig. Er is geen noodoverride in MVP.

---

### 11. Wanneer wordt het publiek van een geplande send bevroren?

**Aanbevolen standaard**

Op het echte sendmoment.

**Waarom**

Zo respecteren we late unsubscribes en nemen we nieuwe geldige wekelijkse subscribers mee. Bij grote afwijking van preview gaat send naar review.

**Bij geen antwoord**

Snapshot op sendmoment, met herbevestiging bij >5% of >50 verschil.

---

### 12. Alleen de visuele editor — bevestigd

Gebruikers maken e-mails in de React Email editor. Er is geen aparte raw-HTML-import of broncode-editor in MVP.

---

### 13. Beelden via React Email + R2 — bevestigd en onderzocht

Gebruik React Email `onUploadImage`, dat paste, drop, file picker en slash command ondersteunt. De callback gebruikt `@convex-dev/r2/react` `useUploadFile`, ontvangt een server-generated object key en retourneert een permanente URL onder aanbevolen `media.devoetbalgazet.be`.

Gebruik niet `r2.getUrl()` in verzonden mails: die signed URL verloopt standaard na 15 minuten. Gebruik een Cloudflare R2 custom domain/CDN. Willekeurige externe image-URL's worden eerst naar R2 geïmporteerd.

---

### 14. Moeten opens/clicks gebruikt worden om automatisch opnieuw te mailen?

**Aanbevolen standaard**

Nee.

**Waarom**

Open data is onbetrouwbaar en resend-to-non-openers verhoogt irritatie en privacy/deliverabilityrisico.

**Bij geen antwoord**

Statistieken alleen voor inzicht; geen automations.

---

## Redactionele vragen

### Editorstructuur en preheader — bevestigd

- De volledige custom e-mailinhoud wordt in de editor gemaakt.
- Er is geen vaste header, masthead, brand shell of template.
- Alleen nieuwsbriefcampagnes krijgen een niet-bewerkbare compliancefooter met unsubscribe en verplichte juridische informatie.
- Transactionele e-mails krijgen geen marketing-unsubscribefooter; alleen hun vereiste typed systeemvariabelen worden gevalideerd.
- Preheader is verplicht vóór test/live send, maar mag tijdens draft nog leeg zijn.

### 15. Geen templates — bevestigd

Een nieuwe e-mail start leeg. Hergebruik gebeurt uitsluitend door een bestaande e-mail te dupliceren.

---

### 16. Geen artikelcount — bevestigd

De e-mail wordt volledig custom gemaakt. Er is geen artikelbegrip, standaardcount of harde/soft artikelwaarschuwing. Algemene HTML-grootte en Gmail clipping blijven wel technische waarschuwingen.

---

### 17. Geen artikelkoppeling — bevestigd

Alle tekst, links, beelden en knoppen worden handmatig in de editor gemaakt. Er is geen artikel-ID, article picker of gesynchroniseerde metadata.

---

### 18. Geen vaste ondertekeningsfunctie — bevestigd

Wanneer een redacteur een naam, rol of sign-off wil, maakt die dit als gewone custom editorcontent. Er is geen speciaal sign-offblok.

---

## Operationele vragen

### 19. Wie ontvangt alerts over mislukte sends?

**Aanbevolen standaard**

Een configureerbare interne lijst met minimaal Admin en verantwoordelijke Journalist. Start met in-app + transactionele e-mail.

**Bij geen antwoord**

Admin e-mailadres uit auth/config; Slack/Twilio niet bouwen.

---

### 20. Hoe lang bewaren we campagne- en recipientdata?

**Aanbevolen standaard**

Gebruik retentie uit document 07:

- campagnecontent als redactioneel archief;
- recipient mapping/aggregaten 24 maanden;
- delivery events 90 dagen;
- componentrecords 30/90 dagen;
- suppressions zolang noodzakelijk.

**Waarom**

Balanceert operationele analyse en dataminimalisatie. Juridische review blijft nodig.

**Bij geen antwoord**

Deze technische defaults worden ingesteld, maar gemarkeerd voor juridische bevestiging.

---

### 21. Mag een failed recipient handmatig opnieuw worden verstuurd?

**Aanbevolen standaard**

Alleen Admin, alleen definitief app-level failed, met suppressioncheck en audit. Nooit voor bounce/complaint en nooit wanneer providerstatus onzeker is.

**Bij geen antwoord**

Recovery volgens deze strikte regels.

---

### 22. Welk permanent CDN-domein gebruiken e-mailbeelden?

**Aanbevolen standaard**

`media.devoetbalgazet.be`, gekoppeld aan de R2-bucket via een Cloudflare custom domain.

**Waarom**

React Email verwacht na upload een definitieve image URL. `r2.getUrl()` verloopt standaard na 15 minuten en is dus ongeschikt voor e-mail. Het `r2.dev` domein is rate-limited en niet geschikt voor productie.

**Bij geen antwoord**

Gebruik `media.devoetbalgazet.be`.

---

## Samenvatting van defaults bij geen antwoord

| Onderwerp | Default |
|-----------|---------|
| Domein | `devoetbalgazet.be`; sending via `nieuws.devoetbalgazet.be` |
| From | Eén divisie: `{{division-slug}}@nieuws.devoetbalgazet.be`; anders `redactie@nieuws.devoetbalgazet.be` |
| Reply-To | `redactie@devoetbalgazet.be` |
| Transactioneel | `redactie@nieuws.devoetbalgazet.be` |
| Tracking | Alle ondersteunde Resend tracking, inclusief opens en clicks |
| Schaaldoel | Geen hard limit; initieel ontwerpen/testen voor 100.000 |
| Sendrol | Admin + Journalist bevestigd |
| Scheduling | In launch-MVP |
| Personalisatie | Alleen audiencefilter, niet body |
| Filterlogica | OR binnen, AND tussen dimensies |
| Transactionele content | Visueel bewerkbaar en versioned; typed vereiste systeemvariabelen |
| Testmail | Verplicht |
| Scheduled snapshot | Op sendmoment |
| HTML import | Uit |
| Beelden | React Email `onUploadImage` → Convex R2 → permanente `media.devoetbalgazet.be` URL |
| Automatische resend | Uit |
| Vaste footer | Alleen compliance/unsubscribe; niet bewerkbaar |
| Preheader | Verplicht vóór test/send |
| Templates | Geen; leeg starten of dupliceren |
| Artikels | Geen koppeling/count; inhoud volledig custom |
| Alerts | In-app + transactionele adminmail |
| Retentie | Defaults uit document 07 |
