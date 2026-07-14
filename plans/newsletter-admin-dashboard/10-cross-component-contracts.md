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

## Contract 3 — artikelrevisies

Het artikeladminmodel heeft immutable publicatierevisies nodig:

### `articleRevisions`

| Veld | Betekenis |
|------|-----------|
| `articleId` | Stabiele artikelidentiteit |
| `version` | Oplopende revisie |
| `status` | published/retracted |
| `headline`, `dek`, `kicker` | Snapshot voor distributie |
| `heroImageId`, `heroAlt`, `credit` | Snapshot |
| `author`, `publishedAt` | Snapshot |
| `divisionIds`, `teamIds`, `categoryId` | Metadata |
| `canonicalPath` | `/nieuws/[slug]` |
| `createdBy`, `createdAt` | Audit |

Publish:

1. maakt immutable `articleRevision`;
2. wijst `articles.currentPublishedRevisionId` aan;
3. start de statische sitebuild;
4. maakt revisie beschikbaar voor nieuwsbriefpicker.

Update van een gepubliceerd artikel maakt een nieuwe revisie. Bestaande nieuwsbriefblokken blijven naar hun gekozen snapshot verwijzen.

### Retraction

Wanneer een artikel wordt ingetrokken:

- `articles.currentPublishedRevisionId` wordt aangepast/verwijderd;
- geselecteerde maar nog niet verzonden campagnes krijgen warning;
- finale sendvalidation blokkeert een retracted revision;
- redacteur kiest vervanging of verwijdert het blok;
- reeds verzonden e-mail blijft historisch ongewijzigd;
- canonieke website-URL volgt publicatiebeleid (404/410/rechtzetting).

### Picker API

Admin-only, gepagineerd en indexed:

- alleen published revisions;
- zoek/filter op metadata;
- geeft minimale carddata;
- geen gated full body nodig.

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

## Contract 5 — transactionele templatecatalogus

| Template | Trigger | Ontvangt uitgeschreven subscriber? |
|----------|---------|------------------------------------|
| `Welcome` | Nieuwe gecombineerde inschrijving | Ja, hoort bij aangevraagde inschrijving |
| `MagicLink` | Expliciet login-/deviceverzoek | Ja |
| `VerifyEmail` | Verificatieverzoek | Ja |
| `PreferencesChanged` | Geauthenticeerde wijziging | Ja, dienstbevestiging |
| `UnsubscribeConfirmed` | Geldige unsubscribe | Ja, één bevestiging indien juridisch/productmatig gewenst |
| `AdminSendAlert` | Operationele sendstatus | Alleen interne adminlijst |

Elke template heeft typed props, code review, previewfixtures en een templateversie.

`Welcome` en `VerifyEmail` mogen later gecombineerd worden wanneer de werkelijke authflow één mail gebruikt; dit is een templatecatalogus, geen verplicht dubbel mailmoment.

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

## Contract 7 — artikelpublicatie naar nieuwsbrief

De oude actie “queue voor volgende nieuwsbrief” wordt verfijnd naar:

- `newsletterEligible: boolean` op gepubliceerde artikelrevisie, standaard true;
- optionele redactionele `newsletterPriority`;
- artikel verschijnt daarmee hoger in de ArticleBlock-picker;
- er wordt niet automatisch een campagne gewijzigd of aangemaakt;
- AI/publicatie kan alleen suggesteren, nooit toevoegen of versturen zonder redacteur.

Dit vermijdt een verborgen globale “volgende issue”-queue en past bij campaign-centric beheer.
