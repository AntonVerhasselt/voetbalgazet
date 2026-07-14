# Convex-datamodel en veiligheidsarchitectuur

## Principes

1. Convex is bron van waarheid; Resend bewaart alleen wat nodig is voor aflevering.
2. Publieke, admin- en interne functies hebben aparte wrappers.
3. Elke publieke Convex-functie heeft expliciete `args`- én `returns`-validators.
4. Alle promises worden geawait.
5. Queries gebruiken indexen en paginatie; geen onbegrensde `.collect()` voor campagnes, subscribers, recipients of events.
6. Node-only rendering en externe API-calls staan in `"use node"` actionbestanden; queries en mutations staan daar nooit.
7. Schedulers en workpools roepen uitsluitend `internal.*`-functies aan.
8. Sendacties zijn idempotent en statusovergangen zijn server-side gevalideerd.

## Componenten

| Component | Verantwoordelijkheid |
|-----------|-----------------------|
| Better Auth Convex component | Adminsessies en identiteit |
| Resend Convex component | Queueing, batching, retries, rate limiting en providerstatus |
| R2 Convex component | Nieuwsbriefbeelden en andere media |
| Workpool (via Resend / eventueel eigen) | Begrensde audiencevoorbereiding en renderjobs |

Nieuwsbrieflogica blijft in de hoofdapp omdat ze nauw samenhangt met subscribers, artikelen en adminrollen. De Resend-component encapsuleert alleen delivery.

## Rollen en wrappers

### Rollen

| Rol | Lezen | Bewerken/testen | Plannen/verzenden | Instellingen/gebruikers |
|-----|-------|-----------------|--------------------|------------------------|
| `admin` | Ja | Ja | Ja | Ja |
| `journalist` | Ja | Ja | Ja | Nee |
| `viewer` | Ja | Nee | Nee | Nee |

Aanbevolen eerste versie: `admin`, `journalist`, `viewer`, in lijn met het bestaande adminplan. Elke live send logt de concrete actor.

### Custom functions

Voorzie:

- `adminQuery` / `adminMutation`: ingelogde gebruiker met adminprofiel;
- `editorQuery` / `editorMutation`: `admin` of `journalist`;
- `viewerQuery`: alle drie rollen;
- `internalQuery`, `internalMutation`, `internalAction`: workers en webhooks;
- aparte beperkte publieke functies voor unsubscribe, preference-tokenexchange en eventueel statuspagina's.

De wrappers:

1. halen Better Auth identity op;
2. zoeken user via een uniek identity-index;
3. controleren `disabledAt`;
4. controleren rol;
5. voegen typed `ctx.user` toe;
6. loggen geen e-mail of token.

## Tabellen

Onderstaande velden zijn richtinggevend. Exacte Convex validators worden tijdens implementatie expliciet uitgeschreven.

### `newsletterCampaigns`

Eén record per nieuwsbriefconcept/campagne.

| Veld | Type | Betekenis |
|------|------|-----------|
| `internalName` | string | Naam in adminlijst |
| `subject` | string | Onderwerpregel |
| `preheader` | string? | Inboxpreview |
| `status` | union | Status uit productmodel, inclusief `needs_review` |
| `activeRevisionId` | Id? | Huidige opgeslagen inhoud |
| `sendRevisionId` | Id? | Immutable versie voor geplande/live send |
| `audienceDefinitionId` | Id? | Opgeslagen filters |
| `senderProfileId` | Id | Afzender/reply-to snapshotbron |
| `scheduledFor` | number? | UTC timestamp |
| `timezone` | string | Voor UI/audit, default `Europe/Brussels` |
| `sendRequestedAt` | number? | Finale bevestiging |
| `sendRequestedBy` | Id? | Actor |
| `recipientCount` | number? | Bevroren totaal |
| `eligibleCountAtPreview` | number? | Laatste preview, niet bindend |
| `sentAt` | number? | Afronding |
| `duplicatedFromCampaignId` | Id? | Herkomst |
| `createdBy`, `updatedBy` | Id | Audit |
| `createdAt`, `updatedAt` | number | Timestamps |
| `revisionNumber` | number | Optimistic concurrency |

Indexen:

- `by_status_and_updatedAt`;
- `by_status_and_scheduledFor`;
- `by_createdBy_and_updatedAt`;
- `by_sentAt`.

Lijstqueries zijn gepagineerd.

### `newsletterRevisions`

Immutable inhoudsversies.

| Veld | Type | Betekenis |
|------|------|-----------|
| `campaignId` | Id | Parent |
| `version` | number | Oplopend binnen campagne |
| `editorFormat` | literal | `react-email-editor` |
| `editorFormatVersion` | number | Migratie |
| `documentJson` | string | Canonieke editorbody |
| `previewHtml` | string? | Afgeleide cache |
| `previewText` | string? | Plaintextcache |
| `rendererVersion` | string | Codeversie |
| `themeVersion` | string | Brandversie |
| `subject`, `preheader` | string | Snapshot |
| `createdBy`, `createdAt` | Id/number | Audit |
| `reason` | union | autosave checkpoint / manual / test / send |

Indexen:

- `by_campaign_and_version`;
- `by_campaign_and_createdAt`.

Oude revisies worden nooit aangepast. Een retentionbeslissing staat in document 07.

### `newsletterAudienceDefinitions`

| Veld | Type | Betekenis |
|------|------|-----------|
| `campaignId` | Id | Parent |
| `newsletterSubscribedOnly` | true | Altijd waar voor marketingmail |
| `divisionIds` | Id[] | OR binnen lijst |
| `favoriteTeamIds` | Id[] | OR binnen lijst |
| `combineDimensionsWith` | literal | `and` in MVP |
| `excludeUnverified` | boolean | Default false wegens single opt-in |
| `createdBy`, `createdAt`, `updatedAt` | audit | |

Arrays zijn klein en begrensd in dit configuratierecord. Ze worden niet gebruikt als database-index voor subscriberselectie.

### `transactionalEmailDefinitions`

Eén record per functioneel type, bijvoorbeeld `welcome` of `magic_link`:

| Veld | Betekenis |
|------|-----------|
| `type` | Stabiele unieke key |
| `displayName` | Adminlabel |
| `draftRevisionId` | Huidige bewerkbare versie |
| `activeRevisionId` | Gepubliceerde immutable versie die triggers gebruiken |
| `allowedVariableKeys` | Kleine expliciete allowlist |
| `requiredVariableKeys` | Moet aanwezig zijn vóór publiceren |
| `status` | draft/active/disabled |
| `updatedBy`, `updatedAt` | Audit |

Index: uniek logisch `by_type`.

### `transactionalEmailRevisions`

- definition ID en oplopende versie;
- editor document JSON;
- subject en preheader;
- gebruikte variable keys;
- preview HTML/text;
- renderer version;
- created/published actor en timestamps;
- successful test revision marker.

Revisies zijn immutable. Publiceren wijzigt alleen `activeRevisionId`.

### `emailMedia`

Metadata naast de geïsoleerde R2-component:

| Veld | Betekenis |
|------|-----------|
| `r2Key` | Server-generated object key |
| `publicUrl` | Permanente CDN-URL onder `media.devoetbalgazet.be` |
| `mimeType`, `size`, `width`, `height` | Validatie/renderdata |
| `uploadedBy`, `createdAt` | Audit |
| `status` | uploading/ready/rejected/deleted |
| `usedBySentEmail` | Verhindert cleanup van live assets |

Indexen:

- `by_r2Key`;
- `by_status_and_createdAt`;
- `by_uploadedBy_and_createdAt`.

De R2-component beheert upload/objectmetadata. De hoofdapp beheert permissies, gebruik en retentie. De component krijgt nooit directe toegang tot campaign- of admin-tabellen; callbacks in de hoofdapp orkestreren beide.

### `newsletterSends`

Een campagne kan technisch één live send hebben. Een aparte tabel houdt operatie en campagnecontent gescheiden.

| Veld | Type | Betekenis |
|------|------|-----------|
| `campaignId` | Id | Uniek voor live send |
| `revisionId` | Id | Immutable content |
| `audienceDefinitionId` | Id | Immutable filters |
| `status` | union | preparing/sending/etc. |
| `requestedBy`, `requestedAt` | audit | |
| `scheduledFor` | number? | |
| `preparationCursor` | string? | Pagineresume |
| `expectedRecipientCount` | number? | Na snapshot |
| `queuedCount` | number | |
| `deliveredCount` | number | Aggregaat |
| `bouncedCount` | number | Aggregaat |
| `complainedCount` | number | Aggregaat |
| `failedCount` | number | Aggregaat |
| `completedAt` | number? | |
| `lastErrorCode` | string? | Geen PII |

Indexen:

- `by_campaign`;
- `by_status_and_scheduledFor`;
- `by_status_and_requestedAt`.

### `newsletterRecipients`

Immutable doelgroep en aflevering per subscriber.

| Veld | Type | Betekenis |
|------|------|-----------|
| `sendId` | Id | Parent |
| `campaignId` | Id | Denormalisatie voor queries |
| `subscriberId` | Id | Ontvanger |
| `normalizedEmailHmac` | string | Correlatie/dedupe zonder raw adres |
| `status` | union | prepared/queued/sent/delivered/bounced/complained/failed/suppressed |
| `resendEmailId` | string? | Componentcorrelatie |
| `idempotencyKey` | string | Afgeleid van send + recipient |
| `exclusionReason` | union? | Alleen voor expliciet gelogde suppressie |
| `queuedAt`, `deliveredAt`, `failedAt` | number? | |
| `lastEventAt` | number? | Event ordering |
| `errorCode` | string? | Geen ruwe providerresponse met PII |

Unieke logische constraint: één recipient per `(sendId, subscriberId)`. Convex heeft geen relationele unique constraint; enforce via index en idempotente preparemutation.

Indexen:

- `by_send_and_subscriber`;
- `by_send_and_status`;
- `by_resendEmailId`;
- `by_subscriber_and_createdAt`.

Grote sends worden per pagina/batch voorbereid, nooit in één mutation.

Het recipientrecord bewaart standaard geen kopie van het e-mailadres. De interne enqueueworker haalt het actuele adres via `subscriberId` op, hercontroleert status/suppression en geeft het alleen aan de Resend-component door. Na subscriber deletion blijft de HMAC alleen waar retentie dit vereist.

### `newsletterDeliveryEvents`

App-level, geminimaliseerde webhookhistoriek:

- `recipientId`;
- `sendId`;
- `providerEventId` voor dedupe;
- `eventType`;
- `providerTimestamp`;
- `receivedAt`;
- veilige `reasonCode`;
- `schemaVersion`.

Indexen:

- `by_providerEventId`;
- `by_recipient_and_providerTimestamp`;
- `by_send_and_eventType`.

De Resend-component heeft eigen deliverydata. Deze tabel bewaart alleen wat de admin-UX, aggregaten en compliance nodig hebben.

### `emailSuppressions`

Voorkomt opnieuw mailen na bounce, complaint of geldige unsubscribe.

| Veld | Type | Betekenis |
|------|------|-----------|
| `subscriberId` | Id? | Indien profiel bestaat |
| `normalizedEmailHmac` | string | Zoeken zonder raw adres als profiel later verwijderd is |
| `type` | union | unsubscribe/hard_bounce/complaint/manual |
| `sourceId` | string? | Campaign/providercorrelatie |
| `createdAt` | number | |
| `clearedAt`, `clearedBy` | optional | Alleen gecontroleerde resubscribe/manual flow |

Indexen:

- `by_emailHmac_and_active`;
- `by_subscriber_and_active`.

Complaint en hard bounce mogen nooit door een gewone campagnefilter worden overschreven.

### `emailSenderProfiles`

- interne naam;
- from name;
- verified from address;
- reply-to;
- physical/editorial footergegevens;
- default boolean;
- verified domain status;
- created/updated audit.

Alleen Admin kan wijzigen. Een sendrevision bewaart een snapshot zodat latere configwijzigingen oude campagnes niet veranderen.

### `newsletterAuditEvents`

Acties:

- campaign created/updated/duplicated;
- revision created/restored;
- audience changed/previewed;
- test requested/completed/failed;
- scheduled/rescheduled/cancelled;
- send confirmed;
- emergency override;
- setting changed.

Bewaar actor, campaign/send ID, timestamp, action en compacte metadata zonder body, e-mailadressen of tokens.

## Subscriberpreferenties en segmentatie-index

Het publieke plan bewaart `divisionIds[]` op `subscribers`. Dat is klein en handig voor het voorkeurenformulier, maar arraywaarden zijn niet geschikt als Convex-index.

Aanbevolen model:

- `subscribers.divisionIds` blijft de canonieke, begrensde voorkeurenarray;
- voeg `subscriberDivisionPreferences` toe als afgeleide indexprojectie:
  - `subscriberId`;
  - `divisionId`;
  - index `by_division_and_subscriber`;
  - index `by_subscriber_and_division`;
- één gedeelde mutation wijzigt array en projectieregels atomair;
- een interne hersteljob kan projectie tegen bron controleren en rebuilden.

Voor favoriete club volstaat `favoriteTeamId` met index `by_favoriteTeam_and_newsletterSubscribed`, of een aanvullende projectietabel als samengestelde indexen te complex worden.

## Functiegroepen

### Queries

- `campaigns.list` — gepagineerd per status;
- `campaigns.getEditorData` — editorrol + campaign;
- `campaigns.getResults` — viewerrol + paginated statusaggregaten;
- `audiences.preview` — berekening met sample en uitsluitingen;
- `catalog.listDivisions` / `listTeams` — adminmetadata;
- `transactional.listDefinitions`, `getEditorData`, `listRecentSends`;
- `emailMedia.list` — paginated, alleen bevoegde adminrollen;
- `senderProfiles.get`.

Geen query gebruikt `Date.now()`. Huidige tijd komt als argument of status wordt door scheduled mutations bijgewerkt.

### Mutations

- `campaigns.create`, `updateDraft`, `duplicate`, `saveRevision`;
- `transactional.updateDraft`, `saveRevision`, `publishRevision`, `restoreAsNewRevision`;
- `audiences.updateDefinition`;
- `tests.request`;
- `sends.requestNow`, `schedule`, `cancelSchedule`;
- `senderProfiles.update`;
- R2 `generateUploadUrl` en `syncMetadata` met editorrolcheck en mediarecordcallback;
- publieke `unsubscribe.request/confirm` en preference-tokenexchange.

`requestNow` en `schedule` doen alleen transactionele validatie en statuswijziging. Externe calls gebeuren in interne actions.

### Internal workers

- prepare recipient pages;
- render recipient variant;
- enqueue via Resend component;
- process webhook;
- recompute aggregates;
- recover stale preparation;
- cleanup Resend component history;
- project subscriber preferences.

## Statusovergangen en idempotency

Elke transitionmutation controleert huidige status:

```text
draft -> scheduled      toegestaan
draft -> preparing      toegestaan na confirm
scheduled -> cancelled  toegestaan vóór claim
scheduled -> needs_review alleen interne scheduler bij grote countafwijking
needs_review -> preparing alleen na nieuwe expliciete confirm
needs_review -> cancelled toegestaan
scheduled -> preparing  alleen interne scheduler
preparing -> sending    alleen wanneer snapshot klaar is
sending -> sent/...     alleen aggregator
```

Herhaalde request met hetzelfde `clientRequestId` geeft dezelfde `sendId`, niet een tweede send.

Idempotency per ontvanger:

```text
newsletter:{sendId}:{subscriberId}
```

De Resend-component beheert provider-idempotency; de app bewaakt daarnaast dat dezelfde recipientjob niet dubbel wordt aangemaakt.

## Webhookveiligheid

- Endpoint via Convex HTTP action.
- Signaturecontrole door de Resend-component met `RESEND_WEBHOOK_SECRET`.
- Onbekende eventtypes veilig negeren en meten.
- Dedupe op provider event ID.
- Out-of-order events accepteren met een monotone statusregel; een late `sent` mag `delivered` niet terugdraaien.
- Response snel retourneren; verwerking eventueel intern schedulen.
- Geen volledige webhookpayload onbeperkt bewaren.

## Secrets en omgevingen

Convex environment:

- `RESEND_API_KEY`;
- `RESEND_WEBHOOK_SECRET`;
- `EMAIL_TOKEN_SECRET`;
- `EMAIL_ADDRESS_HMAC_SECRET`;
- publieke base URL;
- default from/reply-to waar niet in DB;
- R2-config.

Next.js krijgt alleen publieke Convex URL en niet-geheime frontendconfig. Resend key en tokensigning secrets komen nooit in Vercel clientbundles.

Cloud agents en lokale ontwikkeling gebruiken Convex agent mode/afzonderlijke dev deployment. `testMode` blijft aan en echte ontvangers zijn geblokkeerd in development.

## Veiligheidsacceptatie

- Ongeauthenticeerde gebruiker kan geen campagnedata lezen.
- Viewer kan geen mutation uitvoeren.
- Journalist kan geen sender/domaininstellingen wijzigen.
- Alleen een geldige statusovergang kan send starten.
- Client-HTML wordt nooit rechtstreeks live verstuurd.
- Geen public function retourneert recipient e-mailadressen zonder expliciete adminnoodzaak.
- Tokens zijn purpose-bound, opaque en niet gelogd.
- Hard bounce, complaint en unsubscribe worden altijd uitgesloten.
- Een retry kan geen dubbele recipient of dubbele provider-send maken.
