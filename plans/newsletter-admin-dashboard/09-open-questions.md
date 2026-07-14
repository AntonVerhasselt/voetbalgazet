# Open vragen, aanbevelingen en standaardbeslissingen

## Werkwijze

Elke vraag bevat een **aanbevolen standaard**. Als er geen antwoord komt, wordt die keuze gebruikt bij implementatie. Een expliciet antwoord vervangt de standaard en moet in `01-product-decisions.md` worden verwerkt.

## Vragen die echte live verzending blokkeren

### 1. Welk domein en welke afzenderadressen gebruiken we?

**Aanbevolen standaard**

- publiek domein: `voetbalgazet.be`;
- From name: `De Voetbalgazet`;
- From address: `nieuwsbrief@voetbalgazet.be`;
- Reply-To: `redactie@voetbalgazet.be`;
- transactioneel: `service@voetbalgazet.be`.

**Waarom**

Een herkenbaar eigen domein en menselijke reply-to helpen vertrouwen en deliverability. Marketing en dienstmail gescheiden adressen maken filtering en diagnose duidelijk zonder meerdere merken te introduceren.

**Nodig van jou**

- bevestig het echte domein;
- bevestig dat deze mailboxen kunnen bestaan en opgevolgd worden.

**Bij geen antwoord**

Gebruik bovenstaande namen in code/configvoorbeelden, maar blokkeer production send totdat het domein werkelijk verified is.

---

### 2. Welke fysieke en juridische gegevens moeten in de footer?

**Aanbevolen standaard**

Gebruik de maatschappelijke zetel of juridisch goedgekeurde redactionele contactlocatie plus:

- juridische naam;
- fysiek adres;
- redactieadres;
- privacy- en voorwaardenlink;
- verantwoordelijke uitgever waar vereist.

**Waarom**

Een marketingfooter en Belgische publicatie hebben echte identiteits-/contactgegevens nodig. Placeholders mogen nooit live gaan.

**Nodig van jou**

Juridische naam, adres, contactadres en verantwoordelijke uitgever zodra beschikbaar.

**Bij geen antwoord**

Technische implementatie mag doorgaan met duidelijk gemarkeerde placeholders; live send blijft geblokkeerd.

---

### 3. Willen we open- en clicktracking inschakelen?

**Aanbevolen standaard**

- delivery/bounce/complaint: altijd;
- article clicks: aan, gecombineerd met first-party callbackevents;
- opens: uit totdat privacy-/juridische review tracking heeft bevestigd; daarna eventueel aan met “indicatief”-label.

**Waarom**

Delivery is operationeel noodzakelijk. Clicks geven redactioneel nuttig signaal. Opens zijn onnauwkeurig en privacygevoeliger.

**Bij geen antwoord**

Opens uit, clicks aan voor redactionele links, privacycopy daarop afstemmen.

---

### 4. Hoe groot is de verwachte subscriberlijst bij launch en na één jaar?

**Aanbevolen standaard**

Ontwerp direct voor minstens **100.000 subscribers**, ook wanneer launch veel kleiner is:

- alle lijsten gepagineerd;
- recipient snapshot in batches;
- indexed segmentatie;
- geen `collect()` op de volledige lijst;
- resumable workers.

**Waarom**

Deze architectuur kost weinig extra wanneer vroeg gepland en voorkomt een latere fundamentele migratie.

**Bij geen antwoord**

Gebruik 100.000 als performance- en testdoel, met loadtests op representatieve fixtures.

---

## Productvragen met aanbevolen default

### 5. Mag een Journalist zelfstandig live verzenden?

**Aanbevolen standaard**

Ja. `admin` en `journalist` mogen maken, testen, plannen en verzenden; `viewer` is read-only. Elke send vereist finale typed confirm en audit.

**Waarom**

Dit past bij een kleine redactie en het bestaande rollenplan. Een verplichte tweede approver maakt solo-operatie onmogelijk.

**Alternatief**

Voeg later `publisher` capability toe wanneer er meerdere redacteurs zijn en functiescheiding gewenst is.

**Bij geen antwoord**

Gebruik de aanbevolen standaard.

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

### 9. Moeten transactionele templates ook visueel bewerkbaar zijn?

**Aanbevolen standaard**

Nee. Ze blijven code-based React Email-templates, maar alle sends en statussen lopen via custom Convex/Resend.

**Waarom**

Auth- en servicelinks vereisen typed variabelen, code review en voorspelbare copy. Vrije bewerking verhoogt phishing- en regressierisico.

**Bij geen antwoord**

Code-based transactionele templates met read-only adminpreview.

---

### 10. Is een succesvolle testmail verplicht vóór live send?

**Aanbevolen standaard**

Ja, minstens één succesvolle test op exact dezelfde revision, senderconfig en linkconfig.

**Waarom**

Een browserpreview vindt geen provider-, inbox- of domainproblemen.

**Bij geen antwoord**

Test verplicht. Alleen Admin kan later eventueel een gelogde noodoverride krijgen.

---

### 11. Wanneer wordt het publiek van een geplande send bevroren?

**Aanbevolen standaard**

Op het echte sendmoment.

**Waarom**

Zo respecteren we late unsubscribes en nemen we nieuwe geldige wekelijkse subscribers mee. Bij grote afwijking van preview gaat send naar review.

**Bij geen antwoord**

Snapshot op sendmoment, met herbevestiging bij >5% of >50 verschil.

---

### 12. Mogen redacteurs HTML importeren of direct bewerken?

**Aanbevolen standaard**

Nee in MVP.

**Waarom**

Onbeperkte HTML omzeilt editorallowlists, breekt clients en verhoogt XSS/trackingrisico. Een latere Admin-only import kan via zware sanitization en preview.

**Bij geen antwoord**

Alleen visuele editorblokken.

---

### 13. Mogen externe image-URL's gebruikt worden?

**Aanbevolen standaard**

Nee. Importeer/upload naar gecontroleerde R2-opslag.

**Waarom**

Voorkomt hotlinkrot, externe tracking en onverwachte contentwijziging.

**Bij geen antwoord**

Alleen R2/CDN-URL's op allowlist.

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

### 15. Is er één vaste wekelijkse template?

**Aanbevolen standaard**

Start met:

1. één leeg branded document;
2. één `Wekelijkse editie`-template met redactienoot en 3–5 ArticleBlocks.

Templates worden intern in code/Convex beheerd, niet in Resend.

**Bij geen antwoord**

Beide opties beschikbaar; lege start is default voor aankondiging, wekelijkse template voor reguliere editie.

---

### 16. Hoeveel artikels bevat de standaardeditie?

**Aanbevolen standaard**

3–5 hoofdartikels. Waarschuw boven 8 artikelblokken.

**Waarom**

Past bij bestaande plan, houdt e-mail compact en vermindert Gmail clipping/lange mobiele mails.

**Bij geen antwoord**

Template bevat vier voorbeeldslots; redacteur kan aanpassen.

---

### 17. Welke article data mag een redacteur overriden?

**Aanbevolen standaard**

Headline en dek mogen in de nieuwsbrief worden ingekort zonder het artikel te wijzigen. Canonieke URL, artikel-ID, publicatiestatus en afbeeldingbron niet vrij overschrijven.

**Waarom**

Inboxcopy vraagt soms kortere tekst, maar links en publicatiestatus moeten betrouwbaar blijven.

**Bij geen antwoord**

Headline/dek override toegestaan en in campaign revision geaudit.

---

### 18. Komt er een persoonlijke ondertekening?

**Aanbevolen standaard**

Optioneel Redactienoot-blok met naam/functie; geen verplicht persoonlijk profiel in footer.

**Waarom**

Geeft menselijke toon zonder senderconfig per redacteur te fragmenteren.

**Bij geen antwoord**

Geen vaste ondertekening; template biedt optioneel blok.

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

## Samenvatting van defaults bij geen antwoord

| Onderwerp | Default |
|-----------|---------|
| Domein | `voetbalgazet.be`, maar live blocked tot verified |
| From | `De Voetbalgazet <nieuwsbrief@voetbalgazet.be>` |
| Reply-To | `redactie@voetbalgazet.be` |
| Tracking | Delivery + clicks; opens uit tot review |
| Schaaldoel | 100.000 subscribers |
| Sendrol | Admin + Journalist |
| Scheduling | In launch-MVP |
| Personalisatie | Alleen audiencefilter, niet body |
| Filterlogica | OR binnen, AND tussen dimensies |
| Transactioneel | Code-based React Email |
| Testmail | Verplicht |
| Scheduled snapshot | Op sendmoment |
| HTML import | Uit |
| Externe beelden | Uit; R2 only |
| Automatische resend | Uit |
| Templates | Leeg + wekelijkse editie |
| Artikels | 3–5, waarschuwing boven 8 |
| Alerts | In-app + transactionele adminmail |
| Retentie | Defaults uit document 07 |
