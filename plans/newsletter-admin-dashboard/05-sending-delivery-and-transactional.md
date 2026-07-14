# Verzending, aflevering en transactionele e-mail

## Integratiekeuze

Gebruik de officiële [`@convex-dev/resend`](https://www.convex.dev/components/resend) component.

De component levert:

- duurzame queueing;
- batching via Resend batch API;
- retries bij tijdelijke fouten;
- rate limiting;
- idempotency;
- statusopvolging en webhookverwerking.

De app blijft verantwoordelijk voor:

- wie mag versturen;
- welke content en ontvangers gekozen zijn;
- server-side rendering;
- audience snapshot;
- unsubscribe- en preference-links;
- app-level audit en aggregaten;
- suppressionbeleid;
- operationele UI.

## Geen Resend-dashboardworkflow

Niet gebruiken als redactionele bron:

- Resend Templates;
- Resend Audiences;
- handmatig aangemaakte Broadcasts;
- dashboard-only scheduled campaigns.

Reden: die maken Convex incompleet als audit- en statusbron, splitsen permissies en verhogen risico dat een send buiten de custom checks gebeurt.

Het Resend-dashboard mag operationeel read-only gebruikt worden voor providerdiagnose door bevoegde beheerders.

## Omgevingen en testMode

| Omgeving | Resendgedrag |
|----------|---------------|
| Lokale/agent development | Convex geïsoleerde dev deployment; `testMode: true`; alleen Resend testadressen |
| Preview/staging | Aparte Resend key/domain of strikte allowlist; nooit productiepubliek |
| Production | `testMode: false`; verified domein; live audience toegestaan |

Een production send vereist daarnaast een server-side environment guard. Alleen `testMode: false` veranderen mag niet voldoende zijn om vanuit een previewdeployment echte mail te sturen.

## Send now flow

```text
Editor
  -> save immutable revision
  -> validate campaign
  -> successful test revision check
  -> audience preview
  -> final confirm
  -> requestNow mutation
  -> internal recipient preparation
  -> final suppression check
  -> per-recipient render
  -> Resend component queue
  -> webhook/status aggregation
```

### Finale confirm

De mutation ontvangt:

- `campaignId`;
- verwachte campaign revision number;
- `sendRevisionId`;
- audience definition ID + versie;
- verwachte preview count;
- random client request ID;
- expliciete confirmtekst/boolean uit UI.

Server valideert opnieuw:

- actorrol;
- status `draft`;
- revision is huidig;
- testmail hoort bij dezelfde revision;
- sender profile is verified;
- audience geldig;
- geen blocker;
- geen bestaande live send;
- environment is production.

Daarna verandert campagne atomair naar `preparing` en wordt een sendrecord gemaakt. De mutation zelf belt Resend niet.

## Scheduling

### UI

- gebruiker kiest lokale datum en tijd;
- UI toont expliciet `Europe/Brussels`;
- server bewaart UTC timestamp + timezone;
- bij DST-ambiguïteit toont UI de concrete UTC-offset;
- minimale lead time aanbevolen: 10 minuten.

### Backend

Bij plannen:

1. zelfde validaties als send now;
2. immutable revision en audience definition;
3. campagne naar `scheduled`;
4. `ctx.scheduler.runAt` plant uitsluitend een interne mutation;
5. interne mutation claimt alleen nog steeds `scheduled` record;
6. recipient snapshot wordt op sendmoment gemaakt.

Reschedule:

- annuleer bestaande scheduled function indien ondersteund/veilig;
- schrijf nieuwe schedule ID en audit event;
- oude worker moet op status + schedule generation controleren en no-oppen.

Nu verzenden vanuit `scheduled`:

1. gebruiker doorloopt opnieuw het controlescherm;
2. server invalideert de oude schedule generation;
3. oude worker zal no-oppen;
4. dezelfde immutable revision/audience definition gaat via de gewone finale confirm naar `preparing`;
5. actie wordt geaudit als `schedule_overridden_send_now`.

Cancel:

- alleen vóór `preparing`;
- status `cancelled`;
- worker no-ops;
- content blijft zichtbaar en kan gedupliceerd worden.

## Audiencevoorbereiding

- Werk in begrensde batches, bijvoorbeeld 100–500 afhankelijk van Convex-limieten.
- Bewaar cursor/progress na elke batch.
- Gebruik internal mutation voor DB-write en internal action alleen waar Node/externe API nodig is.
- Een retry van dezelfde batch maakt geen dubbele recipient door indexed idempotencycheck.
- Na laatste batch wordt recipient count bevroren.
- Bij geen ontvangers: status `failed` met `AUDIENCE_EMPTY`, niets naar Resend.

## Rendering per ontvanger

De body is gelijk, maar links zijn persoonlijk:

- artikel bootstrap;
- voorkeuren;
- footer unsubscribe;
- eventueel “bekijk online” later.

Renderstrategie:

1. parse en valideer immutable revision;
2. render de gedeelde body éénmaal per sendrevision naar een veilig intermediate model;
3. verwerk recipients in begrensde workpoolbatches, aanbevolen startgrootte 100;
4. compose per recipient alleen de vaste footer en typed linkvariabelen met purpose-bound links;
5. genereer HTML + plaintext zonder het volledige editor-document opnieuw te parsen;
6. queue via de component, die providerbatching en rate limiting beheert.

Geen persoonlijk e-mailadres in body of URL. Tokens zijn random/opaque of ondertekend zonder leesbare PII.

Voor het schaaldoel van 100.000 recipients:

- nooit één action met alle recipients;
- maximaal één begrensde batch per workerclaim;
- concurrency via workpoolconfig, conservatief starten en op providerlimieten afstemmen;
- cursor/progress na iedere batch;
- bodyrendercache keyed op sendrevision + renderer version;
- per-recipient fouten stoppen andere batches niet.

## Headers

Elke live nieuwsbrief bevat:

- `From`;
- `Reply-To`;
- uniek, stabiel `Message-ID` via provider;
- `List-Unsubscribe: <https://...>`;
- `List-Unsubscribe-Post: List-Unsubscribe=One-Click`;
- passende campaign metadata voor correlatie zonder PII.

Controleer tijdens implementatie welke custom headers de actuele Convex Resend-component en batch API ondersteunen.

### One-click unsubscribe

Twee paden:

1. **RFC 8058 provider/mailclient POST**: direct uitschrijven zonder login.
2. **Zichtbare footerlink (GET)**: toont een minimale bevestigingspagina om ongewenste uitschrijving door link scanners te vermijden; bevestiging doet POST.

Beide gebruiken een purpose-bound opaque token en zetten uitsluitend:

- `newsletterSubscribed = false`;
- `unsubscribedAt`;
- actieve unsubscribe suppression.

`siteAccess` en bestaande leessessies blijven actief.

Een oude geldige uitschrijflink moet bruikbaar blijven zolang het subscriberprofiel bestaat. Gebruik daarom een opgeslagen random token of langlevend revocable token, niet een kort 15-minuten auth-token.

### Vaste campagnefooter

De niet-bewerkbare footer van iedere nieuwsbriefcampagne bevat:

- `Uitschrijven`;
- `Voorkeuren aanpassen`;
- privacy- en voorwaardenlink;
- verplichte juridische/contactinformatie zodra ingevuld.

`Voorkeuren aanpassen` gebruikt een eigen purpose-bound token, maakt/ververst een verifiedSubscriber-session en opent `/voorkeuren`. De redacteur kan deze link niet verwijderen, hernoemen of vervangen in de editor.

## Veilige artikel- en voorkeurenlinks

### Artikel

- recipient- en campaigngebonden token;
- maximaal 30 dagen geldig conform publiek plan;
- callback maakt/ververst verifiedSubscriber-session;
- veilige allowlist voor return path;
- 303 redirect naar canonieke `/nieuws/[slug]`;
- token verdwijnt vóór analytics pageview.

### Voorkeuren

- verifiedSubscriber bootstrap;
- purpose `preferences`;
- opent `/voorkeuren`;
- geeft geen admin- of andere accountrechten.

### Forwarding

Doorgestuurde artikellink kan tijdelijk website-toegang geven, een aanvaard risico volgens publiek plan. Een doorgestuurde preference- of unsubscribe-link is gevoeliger:

- unsubscribe blijft noodzakelijk bruikbaar;
- preference-link vereist na bootstrap aanvullende subscriber ownership/sessionchecks;
- tokens zijn revocable bij misbruik.

## Testmails

Testflow:

- alleen Admin/Journalist;
- adres expliciet invoeren of uit beperkte interne testlijst kiezen;
- subject prefix `[TEST]`;
- visuele testbanner;
- testtokens kunnen geen echte subscriber voorkeuren aanpassen;
- geen campaign deliveryaggregaten;
- wel audit event en technische status;
- succesvolle provideracceptatie wordt aan revision ID gekoppeld.

Na inhouds-, onderwerp-, preheader-, sender- of linkwijziging vervalt de “getest”-status.

Een pure audiencewijziging maakt de contenttest niet ongeldig; de finale audiencepreview en confirm moeten wel opnieuw.

## Statussen per recipient

Aanbevolen monotone statusvolgorde:

```text
prepared -> queued -> sent -> delivered
                    ├-> delivery_delayed -> delivered
                    ├-> bounced
                    ├-> complained
                    └-> failed
```

`opened` en `clicked` zijn flags/events, geen vervanging van deliverystatus.

Een latere lagere status mag een hogere finale status niet overschrijven. Bewaar eventhistoriek om out-of-order webhooks te verklaren.

## Campaignresultaat

Campaign wordt:

- `sent`: alle recipients zijn gequeued en er was geen app-level definitieve fout; latere bounces veranderen campaignstatus niet per se maar wel aggregaten;
- `partially_failed`: minstens één recipient kon definitief niet gequeued/gerenderd worden;
- `failed`: geen recipient werd gequeued of voorbereiding/rendering faalde globaal.

De resultatenpagina maakt duidelijk onderscheid tussen:

- geselecteerd;
- alsnog gesuppresseerd;
- gequeued;
- provider sent;
- delivered;
- bounced;
- complained;
- failed.

## Retrybeleid

### Automatisch

De Resend-component retryt tijdelijke:

- netwerkfouten;
- rate limits;
- provider 5xx.

### Niet automatisch

- ongeldige recipient;
- hard bounce;
- complaint;
- onverified sender/domain;
- ongeldige HTML na finale validation;
- ontbrekende secret/config.

### Handmatige recovery

Geen generieke “verstuur opnieuw naar iedereen”.

Een recoveryactie:

1. selecteert alleen definitief app-level failed recipients;
2. hercontroleert suppressions;
3. gebruikt dezelfde sendrevision;
4. maakt aparte recovery batch/audit;
5. gebruikt dezelfde recipient-idempotency wanneer providerstatus onzeker is;
6. vereist Adminbevestiging.

Bij provideronzekerheid eerst status opvragen; nooit blind resend.

## Webhooks

Abonneer minimaal op:

- sent;
- delivered;
- delivery delayed;
- bounced;
- complained;
- failed;
- opened en clicked; beide trackingtypes zijn voor campagnes geactiveerd, met opens als indicatief signaal.

Webhookhandler:

- verifieert signature;
- dedupet event;
- zoekt recipient via Resend email ID;
- past monotone status toe;
- activeert suppression bij hard bounce/complaint;
- werkt aggregaten idempotent bij;
- logt onbekende correlatie zonder payload-PII;
- retourneert snel 2xx na duurzame acceptatie.

## Transactionele mails

### Visueel beheer

Welcome, magic link, verificatie, preferences confirmation, unsubscribe confirmation en adminalerts worden met dezelfde React Email editor in het adminplatform opgebouwd.

Per transactioneel type:

- één draftversie;
- één expliciet gepubliceerde actieve versie;
- immutable versiehistoriek;
- typed toegestane systeemvariabelen;
- lijst van verplichte variabelen;
- preview met veilige dummywaarden;
- verplichte testmail vóór publiceren;
- rollback door een oude versie opnieuw als nieuwe actieve versie te publiceren.

Voorbeeldvariabelen:

```text
{{magic_link}}
{{verification_link}}
{{subscriber_first_name}}  (alleen wanneer dit gegeven werkelijk bestaat)
{{preferences_url}}
{{support_email}}
```

Links/tokens zelf worden pas tijdens serverrendering ingevuld. De editor bewaart alleen de typed variable key. Een redacteur kan tekst, knoplabel, positie, kleuren en overige inhoud aanpassen, maar kan de secret tokenwaarde niet zien of opslaan.

Publicatie wordt geblokkeerd wanneer:

- een vereiste variable ontbreekt;
- onbekende variabelen zijn gebruikt;
- een authlink door een gewone URL werd vervangen;
- preview/render faalt;
- geen succesvolle test op exact die versie bestaat.

Alle transactionele mails worden:

- door custom Convex-functions getriggerd;
- vanuit de actieve visueel gepubliceerde versie gerenderd;
- zonder de marketing-newsletter unsubscribefooter;
- via de Convex Resend-component verzonden;
- in het custom adminoverzicht gemonitord;
- nooit handmatig vanuit het Resend-dashboard gestart.

### Scheiding marketing/dienstmail

Uitschrijven uit de nieuwsbrief blokkeert marketingnieuwsbrieven, maar niet strikt noodzakelijke:

- magic links;
- beveiligingsmeldingen;
- privacy-/dienstwijzigingen voor actieve siteAccess;
- bevestiging van voorkeur- of verwijderverzoek.

De juridische kwalificatie van elk nieuw transactioneel template moet expliciet zijn; “transactioneel” mag niet gebruikt worden om marketingconsent te omzeilen.

## Cleanup

De Resend-component bewaart finalized records totdat de app cleanup uitvoert.

Aanbevolen:

- component finalized deliveryrecords: 30 dagen;
- abandoned records: 90 dagen voor diagnose;
- app-level geminimaliseerde recipientstatus en aggregaten volgens document 07;
- scheduled cron roept alleen interne cleanupfuncties aan.

## Operationele acceptatie

- Een send kan niet dubbel starten bij dubbelklik/retry.
- Resend outage verliest geen geaccepteerde recipientjobs.
- Provider rate limit veroorzaakt queueing, niet massale failure.
- Testmail gebruikt exact dezelfde renderer als live.
- Unsubscribeheader en zichtbare link werken.
- Complaint en hard bounce maken direct suppression.
- Geplande send respecteert `Europe/Brussels`.
- Staging kan nooit naar productiepubliek sturen.
- Transactionele mails zijn volledig via Convex traceerbaar.
