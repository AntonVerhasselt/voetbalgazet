# Contracten met publieke site en artikeladmin

Dit document voorkomt dat de publieke site, artikeladmin en nieuwsbrief elk een ander datamodel of andere tokenroutes implementeren.

## Contract 1 — subscriber en voorkeuren

### Canonieke subscriberstatus

De publieke signupflow schrijft:

- `normalizedEmail`;
- `emailVerifiedAt`;
- `siteAccess`;
- `newsletterSubscribed`;
- consentvelden;
- `divisionIds[]`;
- `favoriteTeamId`;
- deliverystatus.

Er is **geen verplichte Resend contact- of audiencekoppeling**. Resend is transport; Convex selecteert ontvangers.

### Segmentatieprojectie

Iedere mutation die `divisionIds[]` wijzigt, onderhoudt in dezelfde Convex-transactie:

```text
subscriberDivisionPreferences
├─ subscriberId
└─ divisionId
```

Signup en `/voorkeuren` gebruiken één gedeelde plain TypeScript helper zodat de array en projectie niet uiteenlopen.

Een interne repairjob:

- vergelijkt projectie met subscriberbron;
- ondersteunt dry-run met counts/samples;
- schrijft pas na expliciete bevestiging;
- is idempotent.

### Resubscribe

Entry point: `/voorkeuren` voor een geverifieerde subscriber of de bestaande inschrijfsheet.

Flow:

1. UI toont expliciet dat nieuwsbrief momenteel uit staat.
2. CTA `Schrijf me opnieuw in voor de wekelijkse nieuwsbrief`.
3. Server vereist verifiedSubscriber-session.
4. Server schrijft:
   - `newsletterSubscribed = true`;
   - nieuwe `newsletterSubscribedAt`;
   - nieuwe `consentCapturedAt`, `consentVersion`, `consentSource = preferences_resubscribe`;
   - `unsubscribedAt` blijft als historisch feit of verhuist naar status-eventhistoriek.
5. Actieve gewone unsubscribe suppression wordt atomair opgeheven.
6. Complaint/hard-bounce suppression wordt niet automatisch opgeheven.
7. Audit event zonder raw e-mail.

Een bestaand e-mailadres invoeren op een nieuw apparaat schrijft nooit automatisch opnieuw in.

## Contract 2 — publieke routes

Voeg aan het publieke routeplan toe:

| Route | Type | Doel |
|-------|------|------|
| `/email/artikel` | Same-origin server callback | 30-dagen article bootstrap-token wisselen en 303 redirect |
| `/email/voorkeuren` | Same-origin server callback | Verified session bootstrap en redirect naar `/voorkeuren` |
| `/uitschrijven` | Statische/server shell | Scanner-safe GET-bevestigingspagina |
| `/api/email/uitschrijven` | Server POST | Zichtbare confirm en RFC 8058 one-click verwerken |

### Tokenpurpose

Tokens zijn niet onderling bruikbaar:

| Purpose | Levensduur | Mag doen |
|---------|------------|----------|
| `article_access` | 30 dagen | verifiedSubscriber-session + veilige artikelredirect |
| `preferences_access` | aanbevolen 24 uur | verified session + `/voorkeuren`; session subscriber moet token subscriber matchen |
| `unsubscribe` | langlevend/revocable | alleen nieuwsbriefstatus uitzetten |

Alle callbacks:

- accepteren alleen HTTPS in productie;
- bevatten geen leesbare e-mail/subscriber-ID;
- loggen geen token;
- strippen token vóór analytics;
- blokkeren open redirects;
- geven generieke foutcopy.

GET `/uitschrijven` muteert niet vanwege link scanners. RFC one-click clients gebruiken de POST-route met correcte headersemantiek.

## Contract 3 — handmatige content en interne links

Nieuwsbriefcontent is niet gekoppeld aan `articles`, artikelrevisies of een picker. De redacteur schrijft en linkt alles handmatig in de editor.

Wanneer een handmatig ingevoerde veilige link naar `https://devoetbalgazet.be/nieuws/...` wijst:

- de renderer herkent alleen het eigen domein en `/nieuws/` pad;
- per recipient kan hij de bestemming via de bestaande `article_access` bootstrapcallback laten lopen;
- de editorbron bewaart alleen de gewone canonieke URL;
- er wordt geen artikelmetadata opgehaald of gesynchroniseerd;
- een verwijderde of veranderde pagina wordt behandeld als iedere andere handmatige link en verschijnt in de linkcheck.

Hierdoor blijft frictieloze subscriber-toegang mogelijk zonder contentkoppeling.

## Contract 4 — campaign analytics ID

Iedere `newsletterSend` krijgt:

```typescript
campaignAnalyticsId: string; // random opaque ID, geen Convex document-ID
```

Gebruik in publieke PostHog events de property:

```text
campaign_analytics_id
```

Niet gebruiken:

- recipient ID;
- subscriber ID;
- raw Convex campaign/send ID wanneer niet nodig;
- e-mail of token.

De mapping naar intern `sendId` blijft alleen in Convex en is alleen voor bevoegde adminqueries.

## Contract 5 — visueel beheerde transactionele e-mailcatalogus

| E-mailtype | Trigger | Ontvangt uitgeschreven subscriber? |
|----------|---------|------------------------------------|
| `Welcome` | Nieuwe gecombineerde inschrijving | Ja, hoort bij aangevraagde inschrijving |
| `MagicLink` | Expliciet login-/deviceverzoek | Ja |
| `VerifyEmail` | Verificatieverzoek | Ja |
| `PreferencesChanged` | Geauthenticeerde wijziging | Ja, dienstbevestiging |
| `UnsubscribeConfirmed` | Geldige unsubscribe | Ja, één bevestiging indien juridisch/productmatig gewenst |
| `AdminSendAlert` | Operationele sendstatus | Alle actieve Admins + initiërende Journalist, gededuped |

Elk type heeft:

- een visueel beheerd editor-document;
- immutable versies en één actieve gepubliceerde versie;
- typed allowed/required systeemvariabelen;
- veilige previewfixtures;
- verplichte test vóór publicatie;
- audit van editor en publiceerder.

Alle wijzigingen, tests, publicaties en rollbacks zijn Admin-only. Journalist en Viewer krijgen uitsluitend read-only preview/status.

`Welcome` en `VerifyEmail` mogen gecombineerd worden wanneer de werkelijke authflow één mail gebruikt; dit is een typecatalogus, geen verplicht dubbel mailmoment.

## Contract 6 — subscriber deletion

Bij geldig verwijderverzoek:

1. stop newsletter en zet/reconcile suppression;
2. revoke authsessies en purpose tokens;
3. verwijder subscriberprofiel en preferenceprojecties;
4. verwijder of pseudonimiseer recipientlinkage;
5. behoud campagnecontent en geaggregeerde statistieken;
6. behoud alleen minimale HMAC suppression indien nodig om niet opnieuw te mailen;
7. audit zonder raw e-mail;
8. bevestig volgens supportproces.

De privacyverklaring moet deliveryevents en deze minimale suppressionretentie vermelden.

## Contract 7 — geen artikelpublicatiehandoff

Artikelpublicatie:

- maakt geen nieuwsbriefconcept;
- voegt niets toe aan een campagne;
- beheert geen “volgende editie”-queue;
- markeert geen artikel als newsletter-eligible;
- levert geen ArticleBlock-picker.

Een redacteur maakt e-mailcontent volledig handmatig. Dit contract kan later alleen door een expliciete nieuwe productbeslissing veranderen.
