# Newsletter-admin — verfijnd plan

Dit dossier is de bron van waarheid voor het maken, beheren, segmenteren en versturen van nieuwsbrieven in het interne adminplatform van De Voetbalgazet.

De publieke inschrijving en lezerssessies blijven beschreven in [`../public-news-site/`](../public-news-site/). De bredere AI-journalistworkflow blijft beschreven in [`../02-admin-dashboard.md`](../02-admin-dashboard.md). Dit dossier werkt uitsluitend het nieuwsbriefdeel uit.

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
| [09-open-questions.md](./09-open-questions.md) | Open vragen met aanbeveling en standaardbeslissing bij uitblijven van antwoord |
| [10-cross-component-contracts.md](./10-cross-component-contracts.md) | Subscriber-, route-, artikelrevisie-, analytics- en deletioncontracten met andere componenten |

De oudere hoofdpagina [`../03-newsletter.md`](../03-newsletter.md) blijft het architecturale overzicht. Bij verschillen heeft dit verfijnde dossier voorrang.

## Kernbeslissingen

1. **Convex is de enige bron van waarheid.** Concepten, revisies, audience-regels, ontvangers, sendstatussen en aggregaten leven in Convex.
2. **Resend is de afleveringsprovider, niet het redactiesysteem.** Redacteurs maken of beheren geen templates, audiences of broadcasts in het Resend-dashboard.
3. **Nieuwsbriefcampagnes worden visueel gemaakt met `@react-email/editor`.** Het editor-document is de bewerkbare bron; de definitieve HTML- en tekstversie wordt bij verzending opnieuw server-side opgebouwd en bevroren.
4. **Transactionele mails blijven code-based React Email-templates.** Welkomst-, magic-link-, verificatie- en veiligheidsmails zijn niet vrij visueel bewerkbaar, omdat copy, links en beveiligingsgedrag voorspelbaar moeten blijven.
5. **Voorkeuren segmenteren het publiek, niet de inhoud per persoon.** In de eerste versie ontvangt iedereen binnen één verzending dezelfde body. Filters bepalen alleen wie de campagne krijgt.
6. **De doelgroep wordt bij bevestiging bevroren.** Nieuwe inschrijvingen of voorkeurwijzigingen tijdens een send veranderen de ontvangers van die send niet.
7. **Een verzonden campagne is immutable.** Aanpassen of opnieuw versturen gebeurt via dupliceren naar een nieuw concept.
8. **Geen verzending zonder expliciete review.** Testmail, audience preview en finale bevestiging zijn aparte stappen. AI of cron mag nooit zelfstandig een nieuw concept publiceren of versturen.

## Productgrens

### Binnen scope

- concepten maken, bewerken, autosaven en dupliceren;
- visuele e-mailopmaak;
- herbruikbare redactionele blokken, waaronder artikelkaarten;
- desktop- en mobiele preview;
- testmail naar expliciet opgegeven adressen;
- doelgroep beperken op nieuwsbriefstatus, reeks en favoriete club;
- live audience preview met uitsluitingsredenen;
- onmiddellijk of gepland verzenden;
- afleveringsstatussen, bounces, complaints en basisstatistieken;
- audittrail en rolgebaseerde toegangscontrole;
- transactionele mails via dezelfde Convex/Resend-integratie;
- uitschrijf- en voorkeurenlinks.

### Niet in de eerste versie

- per-ontvanger een andere inhoudsvolgorde of andere tekst;
- AI die zonder menselijke bevestiging verstuurt;
- drag-and-drop vrije positionering zoals in een grafische canvaseditor;
- externe HTML importeren zonder sanitization;
- Resend Audiences als bron van waarheid;
- A/B-tests, multivariate onderwerpen of automatische winnaarselectie;
- meerdere merken/domeinen vanuit hetzelfde systeem;
- bijlagen in massamails;
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

## Beslissingsregel voor open vragen

Elke open vraag in [`09-open-questions.md`](./09-open-questions.md) bevat:

- een concreet voorstel;
- waarom dat voorstel de veiligste of eenvoudigste standaard is;
- wat er verandert wanneer een andere keuze wordt gemaakt.

Als er geen antwoord komt, wordt de gemarkeerde **aanbevolen standaard** de implementatiekeuze. Een later expliciet antwoord vervangt die standaard.
