# Implementatiefasen

## Uitgangspunt

Dit is een plan, geen implementatie. De codebase wordt pas opgebouwd nadat de productdefaults en blockers voldoende bevestigd zijn.

De bouwvolgorde minimaliseert risico: eerst auth, data en renderer; daarna editor; pas daarna echte delivery.

## Fase 0 — inputs en definitieve keuzes

### Nodig

- definitief publiek domein;
- from/reply-to;
- fysieke/editoriale footercopy;
- Resend account en verified domeinplan;
- R2 bucket, restricted API token, CORS origins en bevestigd custom CDN domain `media.devoetbalgazet.be`;
- adminrollen/eerste gebruikers;
- alle inputs en launchchecks uit `09-launch-todos.md` die voor de betrokken fase nodig zijn;
- actuele documentatie/packageversies controleren.
- korte technische spike: `@react-email/editor` vrije editor, `onUploadImage` via `@convex-dev/r2`, permanente CDN-URL, gedeelde browser/Node renderer en HTML/plaintextexport bewijzen met de actuele packageversie.

### Deliverables

- ingevulde beslissingsmatrix;
- environmentmatrix development/staging/production;
- testadressen;
- juridische/footerplaceholders ingevuld;
- design tokens beschikbaar.

### Gate

Geen live-sendimplementatie activeren zolang domein, footer en consent/complianceflow niet gekend zijn.

## Fase 1 — foundation en auth

### Backend

- Next.js + Convex projectstructuur;
- Better Auth Convex component;
- same-origin admin auth;
- `users`/adminprofiles en rollen;
- `adminQuery`, `editorMutation`, `viewerQuery`;
- auditbasis;
- Resend component in testMode;
- R2 component;
- `emailMedia` metadata, authenticated upload callbacks en permanent CDN URL contract;
- strict TypeScript en Convex ESLint.

### Admin

- branded shell;
- protected routes;
- forbidden/read-only states;
- placeholder nieuwsbriefnavigation.

### Tests

- unauthenticated denied;
- viewer cannot mutate;
- journalist cannot change settings;
- disabled user denied;
- development cannot send live addresses.

### Exitcriteria

- auth en rollen werken end-to-end;
- geen publieke toegang tot adminfunctions;
- secrets alleen server-side;
- lint/typecheck/build groen.

## Fase 2 — campagne- en revisiemodel

### Backend

- `newsletterCampaigns`;
- `newsletterRevisions`;
- `newsletterAudienceDefinitions`;
- `emailSenderProfiles`;
- `newsletterAuditEvents`;
- validators en indexes;
- create/update/duplicate/list/get;
- optimistic concurrency;
- paginated lists;
- revision creation/restore.

### Admin

- Concepten/Gepland/Verzonden tabs;
- nieuw concept;
- metadataformulier;
- dupliceren;
- draft delete;
- audit timeline;
- save/conflict states.

### Tests

- duplicate kopieert alleen toegestane velden;
- sent/cancelled kan niet naar draft;
- stale revision update faalt;
- lists pagineren correct;
- viewer read-only.

### Exitcriteria

- volledige draftworkflow zonder editorbody of e-maildelivery;
- statusmachine server-side afgedwongen.

## Fase 3 — visual editor en renderer

### Editor

- `@react-email/editor`;
- gedeelde extension registry;
- standaardblokken;
- neutrale editor-defaults zonder vaste template;
- autosave;
- revision checkpoints;
- image upload via React Email `onUploadImage` + R2 `useUploadFile`;
- permanente `media.devoetbalgazet.be` URL in plaats van expiring `r2.getUrl`;
- link allowlist.

### Renderer

- server-side parse/validation;
- React Email envelope;
- HTML + plaintext;
- renderer/theme versioning;
- previewcache;
- sanitization;
- size limits.

### Preview

- inbox;
- desktop;
- mobiel;
- plaintext;
- linkcheck;
- validation checklist.

### Transactionele editor

- definitions voor welcome, magic link, verificatie en andere dienstmails;
- dezelfde vrije visuele editor;
- typed allowed/required system variables;
- draft/active immutable versions;
- previewfixtures zonder echte tokens;
- verplichte test en expliciete versiepublicatie;
- triggerfuncties lezen uitsluitend de actieve versie.
- alle veranderacties Admin-only; Journalist/Viewer read-only.

### Tests

- block snapshots;
- malicious/invalid document rejected;
- unsupported URL schemes rejected;
- images require alt;
- R2 paste/drop/slash uploads vervangen blob URL door permanente CDN-URL;
- browser/server output equivalent;
- long content/Unicode.
- ontbrekende/vervalste transactionele systeemvariabelen;
- publish/rollback van transactionele editorversies.
- Journalist kan geen transactionele draft/test/publicatie mutation uitvoeren.

### Exitcriteria

- redacteur kan concept visueel maken en na reload identiek verder bewerken;
- server maakt deterministische email-safe output;
- geen client-HTML vertrouwenspad.
- de Phase 0 editor/R2/renderer-spike is in de echte architectuur bevestigd.

## Fase 4 — subscribers en audience preview

### Data

- integreer bestaande subscriberstatussen;
- `subscriberDivisionPreferences` projectie;
- indexes voor newsletterstatus, club en reeks;
- `emailSuppressions`;
- projection repair job.

### Audience

- basiseligibility;
- reeks OR;
- club OR;
- AND tussen dimensies;
- previewaggregaten;
- gemaskeerde sample;
- readable audience description;
- previewtimestamp en finale count-delta voor audit.

### Admin

- publieksscherm;
- filterchips;
- reach breakdown;
- informatieve previewtimestamp;
- empty audience blocker.

### Tests

- unsubscribe/bounce/complaint altijd uitgesloten;
- filtervoorbeelden uit document 04;
- projectieconsistentie;
- pagination/large fixture;
- geen raw e-mail in analytics.

### Exitcriteria

- counts zijn uitlegbaar en herhaalbaar;
- performance blijft binnen Convexlimieten voor verwachte lijstgrootte.

## Fase 5 — testmail

### Backend

- immutable testrevision;
- Node renderer;
- Resend component send in testMode;
- teststatus per revision;
- technische deliverystatus;
- audit.

### Admin

- testadresinput/allowlist;
- `[TEST]` en banner;
- success/failure status;
- huidige revision indicator.

### Tests

- testadres wordt geen subscriber;
- test beïnvloedt geen campaignstats;
- contentwijziging invalidate test;
- invalid sender/config geeft duidelijke fout.

### Exitcriteria

- dezelfde renderer en headers als live;
- minstens Gmail/Outlook/Apple Mail handmatig beoordeeld met testaccounts.

## Fase 6 — live send en immutable snapshot

### Backend

- `newsletterSends`;
- `newsletterRecipients`;
- prepare worker met cursor;
- final suppression check;
- idempotent recipient creation;
- per-recipient links;
- queue via Resend component;
- campaign aggregates;
- failure/recoverystates;
- production environment guard.

### Admin

- controlescherm;
- finale confirm met count;
- send progress;
- resultatenbasis;
- recipientdetail gepagineerd.

### Tests

- dubbelklik start één send;
- workerretry maakt geen duplicate;
- unsubscribe tijdens prepare wordt gerespecteerd;
- 0 audience faalt vóór provider;
- simulated Resend outage;
- partial render failure;
- large audience fixture;
- kill switch.

### Rollout

1. interne allowlist;
2. kleine production-config smoketest naar eigen team;
3. nog geen publiek segment vóór webhooks, unsubscribe, scheduling en operations uit fasen 7–9 klaar zijn.

### Exitcriteria

- één gecontroleerde interne productie-smoketest end-to-end;
- geen duplicate recipient;
- resultaten correleren met component/provider.

## Fase 7 — webhooks, unsubscribe en preferences

### Backend

- signed Resend webhook;
- event dedupe;
- monotone state;
- bounce/complaint suppression;
- RFC one-click unsubscribe;
- visible confirmation flow;
- preference/bootstrap tokens;
- article token 30 dagen;
- component reconciliation.

### Publieke integratie

- unsubscribe confirmation route;
- preferences route uit public-site plan;
- article session bootstrap;
- token sanitization vóór PostHog.

### Tests

- invalid signature;
- duplicate/out-of-order event;
- GET scanner veroorzaakt geen unsubscribe;
- one-click POST wel;
- siteAccess blijft na unsubscribe;
- forwarded tokenrisico volgens plan;
- old unsubscribe link werkt;
- deleted subscriber token faalt veilig.

### Exitcriteria

- volledige complianceflow en suppressions;
- bounce/complaint worden binnen webhooklatency verwerkt.

## Fase 8 — scheduling en operations

### Backend

- schedule/reschedule/cancel;
- internal `runAt`;
- schedule generation guard;
- Europe/Brussels conversie;
- finale countberekening zonder automatische stop;
- cleanup crons;
- recovery;
- alerts/monitoring.

### Admin

- planning UI;
- DST-copy;
- preview-versus-final countweergave;
- settings;
- dienstmailoverzicht;
- incident/kill switch UI.

### Tests

- winter/zomertijd;
- old scheduled worker no-op;
- cancel race;
- countafwijking stopt send niet en wordt correct geaudit;
- cleanup;
- missing webhook;
- alert simulations.

### Exitcriteria

- geplande send werkt zonder handmatige aanwezigheid;
- gemiste schedule wordt gealerteerd; gewone audiencecountafwijking verstuurt door met actuele eligibility.

## Fase 9 — analytics en polish

- PostHog admin events;
- newsletter-to-site attribution;
- results UX;
- opens als indicatief;
- linkposition reporting;
- accessibilityaudit;
- responsive admin;
- performanceprofiling;
- copyreview;
- juridische review;
- runbooks.

De publieke nieuwsbrieflaunch gebeurt pas na afronding van fase 9 en de volledige Definition of Done. Daardoor blijft scheduling onderdeel van de launch-MVP, ook al wordt de kern van live delivery technisch eerder gebouwd en intern getest.

## Afhankelijkheden

```text
Admin auth
  └─ Campaign model
      ├─ Visual editor + renderer
      └─ Subscriber/audience integration
          └─ Testmail
              └─ Live send
                  ├─ Webhooks/suppression
                  └─ Scheduling/operations
                      └─ Analytics/polish
```

Publieke site dependencies:

- subscriber schema/statussen;
- divisions/teams catalog;
- publieke URL- en session-bootstrapcontracten;
- preferences route;
- session bootstrap callback;
- privacy/voorwaarden/contactdata.

Er is geen admin-artikeldependency: e-mailinhoud wordt handmatig gemaakt. Wanneer een redacteur zelf een interne `/nieuws/...`-link invoegt, kan de serverrenderer die link voor de ontvanger omzetten naar de bestaande veilige article-bootstrapflow zonder artikelpicker of contentkoppeling.

## CI en kwaliteitschecks

Bij elke relevante change:

- format;
- ESLint inclusief `@convex-dev/eslint-plugin`;
- TypeScript strict;
- Convex codegen/typecheck in geïsoleerde devomgeving;
- unit tests;
- email render snapshots;
- Next.js build;
- accessibility smoke;
- geen secrets in bundle;
- migration dry-run voor datamodificaties.

Voor datafixes/migraties:

1. één script met `--dry-run` of expliciet paar;
2. zelfde queries/validaties in dry en real mode;
3. dry-run onmiddellijk uitvoeren;
4. counts, samples, warnings rapporteren;
5. pas na expliciete bevestiging uitvoeren.

## Definition of done voor launch

- [ ] Alle MVP-items uit document 01
- [ ] Alle securityacceptatie uit document 03
- [ ] Alle audienceacceptatie uit document 04
- [ ] Alle deliveryacceptatie uit document 05
- [ ] UX-foutstaten en accessibility uit document 06
- [ ] Privacy, retentie, deliverability en runbooks uit document 07
- [ ] Open blockers uit document 09 opgelost
- [ ] Production environment guard getest
- [ ] SPF/DKIM/DMARC verified
- [ ] One-click unsubscribe getest
- [ ] Testsend en kleine production pilot geslaagd
- [ ] Geen PII/tokens in PostHog of logs
- [ ] Incident kill switch en recovery getest

## Niet combineren met eerste implementatie

Om scope en risico te beheersen, niet tegelijk bouwen:

- collaborative editor;
- per-recipient contentpersonalisatie;
- A/B-testing;
- re-engagement automation.

Deze vallen buiten het MVP.
