# Publiek en segmentatie

## Doel

De redacteur moet:

- aan alle geldige nieuwsbriefsubscribers kunnen sturen;
- het publiek kunnen beperken op gekozen reeksen;
- het publiek kunnen beperken op favoriete club;
- vóór bevestiging exact begrijpen wie wel en niet wordt meegenomen;
- erop kunnen vertrouwen dat het publiek tijdens de send niet verandert.

Segmentatie is geen vervanging voor consent- en deliverychecks. Die basisfilters zijn altijd actief en kunnen niet door de UI worden uitgeschakeld.

## Bevestigde standaardselectie

Een nieuw of leeg concept start met `Alle actieve abonnees`. Dit is een echte audiencekeuze, geen verborgen impliciete fallback:

- het publieksscherm toont de selectie en count;
- de redacteur moet ze expliciet bevestigen vóór test/send;
- filters zijn optioneel;
- dupliceren kopieert de vorige audiencefilters.

## Basisgeschiktheid

Een subscriber is alleen eligible wanneer op het moment van snapshot:

1. `newsletterSubscribed = true`;
2. `unsubscribedAt` niet recenter is dan de laatste geldige resubscribe;
3. geen actieve `unsubscribe` suppression bestaat;
4. geen actieve hard-bounce suppression bestaat;
5. geen actieve complaint suppression bestaat;
6. het adres syntactisch geldig en genormaliseerd is;
7. subscriber niet administratief geblokkeerd of verwijderd is.

Bevestigd niet vereist:

- `emailVerifiedAt` is gevuld.

Reden: het publieke product kiest bewust voor single opt-in en onmiddellijke nieuwsbriefinschrijving. Alleen geverifieerde adressen mailen zou geldige nieuwe subscribers stilzwijgend uitsluiten. Bounces en complaints corrigeren ongeldige of ongewenste adressen.

## Beschikbare filters in MVP

### Reeks

- Nul geselecteerd: geen reeksbeperking.
- Eén geselecteerd: subscriber heeft die reeks gekozen.
- Meerdere geselecteerd: subscriber heeft **minstens één** van de geselecteerde reeksen.

### Favoriete club

- Nul geselecteerd: geen clubbeperking.
- Eén of meer geselecteerd: `favoriteTeamId` is één van de geselecteerde clubs.

### Combinatie tussen dimensies

Wanneer zowel reeks als club geselecteerd is:

```text
(subscriber heeft reeks A OF reeks B)
EN
(favoriete club is X OF Y)
```

Dit is de bevestigde vaste MVP-logica. Een vrije boolean querybuilder is foutgevoelig en maakt audiencebeschrijvingen moeilijk controleerbaar.

## Voorbeelden

| Filter | Wordt opgenomen |
|--------|-----------------|
| Geen voorkeurfilter | Alle eligible subscribers |
| P1 Antwerpen | Subscribers met P1 Antwerpen in hun reeksen |
| P1 of P2 Antwerpen | Subscribers met minstens één van beide |
| Favoriete club KFC Duffel | Alleen subscribers die KFC Duffel expliciet als favoriet kozen |
| P1 Antwerpen + KFC Duffel | Subscriber moet P1 Antwerpen volgen én KFC Duffel favoriet hebben |

Een subscriber zonder favoriete club valt uit wanneer een clubfilter actief is.

## Geen impliciete club-naar-reeksuitbreiding

Als een club in P1 Antwerpen speelt, betekent “KFC Duffel” niet automatisch “alle volgers van P1 Antwerpen”. De clubfilter gebruikt alleen expliciete favoriete club.

Omgekeerd bevat “P1 Antwerpen” ook subscribers zonder favoriete club en subscribers met een andere club in die reeks.

Dit houdt filters uitlegbaar en voorkomt verrassend brede sends.

## Audience preview

### Output

Na elke filterwijziging toont het panel:

- totaal eligible vóór voorkeurfilter;
- totaal na filter;
- uitgesloten wegens unsubscribe;
- uitgesloten wegens bounce/complaint/manual suppression;
- uitgesloten wegens reeksfilter;
- uitgesloten wegens clubfilter;
- percentage van de actieve lijst;
- timestamp van berekening;
- een privacyveilige steekproef van maximaal 20 ontvangers voor bevoegde rollen.

De normale previewsteekproef toont bij voorkeur:

- gemaskeerd adres, bijvoorbeeld `a***@example.com`;
- gekozen reeksen;
- favoriete club;
- reden van inclusion.

Volledige adressen alleen op een expliciete recipientdetailpagina voor Admin/Journalist, met auditlogging.

### Performance

Preview gebruikt:

- indexed candidate selection;
- begrensde aggregatiejobs bij grote populaties;
- een kortlevende previewcache op filterhash + subscriber data version;
- een duidelijke “wordt berekend”-state.

De getoonde count is informatief. Bij Send nu wordt de finale count direct na bevestiging berekend; bij scheduling pas op het geplande sendmoment.

### Gewijzigde count na preview

Als subscribers of suppressions veranderen na preview:

- het systeem stopt of annuleert de send niet vanwege een countverschil;
- de backend gebruikt altijd de actuele eligibility en voorkeuren op snapshotmoment;
- preview count, finale count en verschil worden in audit/resultaat getoond;
- unsubscribes, suppressions en nieuwe geldige subscribers worden automatisch correct verwerkt.

De finale typed sendbevestiging blijft vereist op het moment dat de campagne wordt gepland of direct gestart. Er komt geen tweede bevestiging alleen wegens audiencegroei.

## Finale audiencebeschrijving

Elke audience definition krijgt automatisch leesbare copy:

> Alle actieve nieuwsbriefabonnees die P1 Antwerpen of P2 Antwerpen volgen en KFC Duffel als favoriete club hebben. Uitgeschreven, gebouncete en klagende adressen worden altijd uitgesloten.

Deze beschrijving staat:

- op het controlescherm;
- in de finale bevestigingsmodal;
- in de audittrail;
- op de resultatenpagina.

## Immutable recipient snapshot

Bij Send nu start dit direct na confirm. Bij een geplande campagne start dezelfde flow pas op het geplande sendmoment:

1. maak `newsletterSend`;
2. claim campagne zodat geen tweede send kan starten;
3. pagineer door indexed candidates;
4. hercontroleer basisgeschiktheid per subscriber;
5. pas voorkeurfilters toe;
6. maak idempotent `newsletterRecipient`-records;
7. tel records en vergelijk met finale count;
8. zet send naar `sending`;
9. queue afleveringen.

Een subscriber die daarna:

- inschrijft: krijgt deze campagne niet;
- voorkeuren wijzigt: blijft volgens snapshot wel of niet opgenomen;
- uitschrijft vóór zijn job gequeued is: wordt opnieuw gecontroleerd en gesuppresseerd;
- unsubscribet nadat provider-send gebeurde: kan die al verstuurde mail niet terughalen, maar krijgt niets nieuws.

De laatste unsubscribe/suppressioncheck gebeurt dus zo dicht mogelijk vóór enqueue. De snapshot bewaart wel dat de persoon oorspronkelijk geselecteerd was en waarom eventueel alsnog gesuppresseerd.

## Indexstrategie

### Alle subscribers

Pagineer via een index zoals:

```text
by_newsletterSubscribed_and_normalizedEmail
```

en controleer suppressions per batch.

### Reeksfilter

Gebruik `subscriberDivisionPreferences.by_division_and_subscriber`, verzamel kandidaten per geselecteerde reeks en dedupe op subscriber-ID.

### Clubfilter

Gebruik een index op subscribers:

```text
by_favoriteTeam_and_newsletterSubscribed
```

### Intersectie

Begin met de meest selectieve dimensie, dedupe IDs en verifieer de overige dimensies via subscriber/profiledata. Bij zeer grote populaties kan een voorbereidingsjob tijdelijke candidate records maken; geen onbegrensde arrays in één Convex-document.

## Voorkeuren wijzigen

Het publieke voorkeurenplan blijft leidend:

- minstens één reeks;
- maximaal één favoriete club;
- alleen via verifiedSubscriber-session;
- wijziging beïnvloedt toekomstige sends;
- wijziging trekt reeds gequeue-de mail niet terug;
- gewone preference-update schrijft nooit opnieuw in na unsubscribe.

Resubscribe is een aparte expliciete actie met nieuwe consentregistratie.

## Suppressionprioriteit

Van hoog naar laag:

1. complaint;
2. hard bounce;
3. unsubscribe;
4. manual suppression;
5. campaignfilter.

Een voorkeurmatch kan suppression nooit overrulen.

Manual unsuppress:

- alleen Admin;
- vereist reden;
- niet toegestaan voor complaint zonder nieuw aantoonbaar consent;
- hard bounce alleen na adrescorrectie of nieuwe verificatie;
- wordt geaudit.

## Geplande sends

De recipient snapshot wordt **op sendmoment**, niet bij planning, gemaakt.

Redenen:

- late unsubscribes worden gerespecteerd;
- nieuwe subscribers kunnen de wekelijkse editie nog ontvangen;
- voorkeuren op het moment van verzending zijn leidend.

Het controlescherm bij plannen bewaart de preview count als referentie. Op sendmoment wordt zonder extra review de actuele eligible recipientlijst gemaakt. Het verschil verschijnt achteraf in audit en resultaten.

## Segmentatie buiten MVP

Later, alleen na aparte productbeslissing:

- provincie;
- engagement (“las minstens X artikels”);
- nieuwe subscribers sinds datum;
- delivered/non-clicked eerdere campagne;
- gepersonaliseerde blokken per club/reeks;
- saved audiences;
- exclusions tussen campagnes;
- frequency caps.

Gedragssegmentatie en re-engagement hebben grotere privacy- en deliverability-impact en worden niet stilzwijgend toegevoegd.

Bevestigde MVP-grens: alle recipients binnen één campagne krijgen dezelfde handmatig gemaakte editorcontent. Voorkeuren bepalen alleen inclusion/exclusion.

## Acceptatiecriteria

- Geen filter kan unsubscribed, hard-bounced of complained ontvangers toevoegen.
- OR binnen dimensie en AND tussen dimensies is zichtbaar en getest.
- Audience preview verklaart inclusie en uitsluiting.
- Finale sendcount wordt server-side opnieuw bepaald.
- Audiencecountverschil stopt de send niet en wordt wel geaudit.
- Snapshotcreatie is hervatbaar en idempotent.
- Subscriber wordt maximaal eenmaal per send opgenomen.
- Unsubscribe vlak vóór enqueue wordt nog gerespecteerd.
- Voorkeurwijziging wijzigt geen reeds verzonden campagnehistoriek.
