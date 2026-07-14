# Newsletter-admin — verfijnd plan

Dit dossier is de bron van waarheid voor het maken, beheren, segmenteren en versturen van nieuwsbrieven in het interne adminplatform van De Voetbalgazet.

De publieke inschrijving en lezerssessies blijven beschreven in [`../public-news-site/`](../public-news-site/). Artikelbeheer staat in [`../content-admin/`](../content-admin/). Dit dossier werkt uitsluitend het nieuwsbriefdeel uit.

Alle schermen en gerenderde e-mails volgen de mobile-first regels uit [`../ui-ux/`](../ui-ux/). De editor moet volledig bruikbaar zijn op telefoon; e-mails worden eerst op 320–375 px ontworpen en daarna voor desktop verrijkt.

## Documenten

| Document | Inhoud |
|----------|--------|
| [01-product-decisions.md](./01-product-decisions.md) | Productkeuzes, terminologie, scope, routes en statusmodel |
| [02-editor-and-content.md](./02-editor-and-content.md) | React Email visual editor, contentmodel, blokken, autosave, versies en preview |
| [03-convex-data-and-security.md](./03-convex-data-and-security.md) | Convex-tabellen, indexen, functies, auth, rechten en veiligheidsgrenzen |
| [04-audience-and-segmentation.md](./04-audience-and-segmentation.md) | Ontvankelijkheid, voorkeurfilters, audience preview en immutable send snapshot |
| [05-sending-delivery-and-transactional.md](./05-sending-delivery-and-transactional.md) | Resend-component, testmail, planning, batchsend, webhooks en transactionele mail |
| [06-admin-ux-and-workflows.md](./06-admin-ux-and-workflows.md) | Schermen, flows, rollen, bevestigingen, foutstaten en toegankelijkheid |
| [07-analytics-compliance-and-operations.md](./07-analytics-compliance-and-operations.md) | Statistieken, AVG, retentie, monitoring, incidenten en operationele procedures |
| [08-implementation-phases.md](./08-implementation-phases.md) | Bouwvolgorde, afhankelijkheden, teststrategie en acceptatiecriteria per fase |
| [09-launch-todos.md](./09-launch-todos.md) | Nog in te vullen bedrijfsgegevens, productieconfiguratie en launchchecks |
| [10-cross-component-contracts.md](./10-cross-component-contracts.md) | Subscriber-, route-, handmatige-link-, analytics- en deletioncontracten met andere componenten |

De oudere hoofdpagina [`../03-newsletter.md`](../03-newsletter.md) blijft het architecturale overzicht. Bij verschillen heeft dit verfijnde dossier voorrang.

## Kernbeslissingen

1. **Convex is de enige bron van waarheid.** Concepten, revisies, audience-regels, ontvangers, sendstatussen en aggregaten leven in Convex.
2. **Resend is de afleveringsprovider, niet het redactiesysteem.** Redacteurs maken of beheren geen templates, audiences of broadcasts in het Resend-dashboard.
3. **Alle e-mailinhoud wordt visueel gemaakt met `@react-email/editor`.** Nieuwsbrieven én transactionele mails worden vanuit het adminplatform beheerd; het editor-document is de bewerkbare bron.
4. **Alleen bij nieuwsbriefcampagnes is de minimale compliancefooter vergrendeld.** Ze bevat altijd `Uitschrijven`, `Voorkeuren aanpassen` en verplichte juridische/contactinformatie. Er is geen vaste brandheader, masthead, template of contentkoppeling. Transactionele e-mails hebben deze marketingfooter niet; hun vereiste systeemlinks/variabelen worden per type gevalideerd.
5. **Alleen Admins mogen transactionele e-mailinhoud wijzigen.** Journalists en Viewers kunnen de actieve versie en sendstatus read-only bekijken, maar niet bewerken, testen, publiceren of terugrollen.
6. **Voorkeuren segmenteren het publiek, niet de inhoud per persoon.** In de eerste versie ontvangt iedereen binnen één verzending dezelfde body. Filters bepalen alleen wie de campagne krijgt.
7. **De doelgroepdefinitie wordt bij bevestiging bevroren; concrete recipients pas bij send.** Bij Send nu gebeurt dit direct. Bij scheduling worden de recipients op het geplande sendmoment bepaald, zodat nieuwe inschrijvingen en unsubscribes tot dan meetellen.
8. **Een verzonden campagne is immutable.** Aanpassen of opnieuw versturen gebeurt via dupliceren naar een nieuw concept.
9. **Geen verzending zonder expliciete review.** Testmail, audience preview en finale bevestiging zijn aparte stappen. Een scheduler mag alleen een reeds expliciet bevestigde campagne uitvoeren.

## Productgrens

### Binnen scope

- concepten maken, bewerken, autosaven en dupliceren;
- visuele e-mailopmaak;
- volledig vrije opbouw met de standaardblokken van de editor;
- desktop- en mobiele preview;
- testmail naar expliciet opgegeven adressen;
- doelgroep beperken op nieuwsbriefstatus, reeks en favoriete club;
- live audience preview met uitsluitingsredenen;
- onmiddellijk of gepland verzenden;
- afleveringsstatussen, bounces, complaints en basisstatistieken;
- audittrail en rolgebaseerde toegangscontrole;
- visueel bewerkbare transactionele mails met versiebeheer en vereiste systeemvariabelen;
- uitschrijf- en voorkeurenlinks.

### Niet in de eerste versie

- per-ontvanger een andere inhoudsvolgorde of andere tekst;
- drag-and-drop vrije positionering zoals in een grafische canvaseditor;
- externe HTML importeren zonder sanitization;
- Resend Audiences als bron van waarheid;
- A/B-tests, multivariate onderwerpen of automatische winnaarselectie;
- meerdere merken/domeinen vanuit hetzelfde systeem;
- bijlagen in massamails;
- templates of automatische artikelkoppelingen in het MVP;
- een publieke archive-webpagina voor volledige nieuwsbriefinhoud;
- bidirectionele templatebewerking in het Resend-dashboard.

## Relatie tot bestaande plannen

| Bestaande beslissing | Gevolg voor dit dossier |
|----------------------|--------------------------|
| `siteAccess` en `newsletterSubscribed` zijn apart | Uitschrijven sluit de lezer niet uit van de website |
| Minstens één reeks, maximaal één favoriete club | Segmentatiefilters gebruiken exact deze voorkeuren |
| Nieuwsbrieflinks openen artikels met verified session bootstrap | Elke ontvanger krijgt eigen purpose-bound artikellinks |
| Publieke site blijft niet-gepersonaliseerd | Segmentatie gebeurt alleen bij e-mailverzending |
| Better Auth voor admin | Alle nieuwsbriefmutaties gebruiken admin-/redactiewrappers |
| Resend via Convex-component | Queuing, batching, retries en idempotency blijven backendverantwoordelijkheid |
| R2 als mediastore | Beelden uit de editor verwijzen naar gecontroleerde R2-assets |

## Planstatus

Alle MVP-product- en architectuurvragen zijn beantwoord en in dit dossier verwerkt. Wat nog ontbreekt zijn concrete bedrijfsgegevens, secrets, DNS/providerconfiguratie en operationele launchchecks; die staan in [`09-launch-todos.md`](./09-launch-todos.md).
