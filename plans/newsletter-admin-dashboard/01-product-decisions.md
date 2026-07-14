# Productbeslissingen

## Positionering

Het nieuwsbriefdeel van het adminplatform is een eigen redactionele toepassing. Een redacteur moet er zonder HTML-kennis een professionele nieuwsbrief kunnen opbouwen, een controleerbare doelgroep kiezen, testen en verzenden.

De toepassing vervangt voor de redactie de broadcast- en templatefuncties van het Resend-dashboard. Resend blijft uitsluitend de technische afleveringsprovider.

## Terminologie

Gebruik in de UI consequent:

| Technische term | Nederlandse UI-term | Betekenis |
|-----------------|----------------------|-----------|
| campaign | nieuwsbrief | Eén redactionele verzending met onderwerp, inhoud en doelgroep |
| draft | concept | Bewerkbare nieuwsbrief die nog niet wordt verstuurd |
| revision | versie | Opgeslagen inhoudstoestand van een concept |
| audience | publiek | Potentiële ontvangers op basis van voorkeurfilters |
| recipient snapshot | ontvangerslijst | Bevroren lijst voor één concrete verzending |
| delivery | aflevering | Eén provider-send naar één e-mailadres |
| transactional email | dienstmail | Functionele mail zoals welkom of magic link |

Het oudere plan gebruikt `newsletterIssues`. De implementatienaam wordt **`newsletterCampaigns`**, omdat een campagne ook test-, planning-, audience- en afleveringsstatus bevat. De UI blijft “Nieuwsbrief” zeggen.

## Hoofdroutes

| Route | Doel |
|-------|------|
| `/admin/nieuwsbrieven` | Overzicht met Concepten, Gepland en Verzonden |
| `/admin/nieuwsbrieven/nieuw` | Nieuw concept aanmaken vanuit leeg document of eigen template |
| `/admin/nieuwsbrieven/[campaignId]` | Editor met instellingen, autosave en preview |
| `/admin/nieuwsbrieven/[campaignId]/publiek` | Audiencefilters, bereik, uitsluitingen en ontvangerssteekproef |
| `/admin/nieuwsbrieven/[campaignId]/controleren` | Finale checklist, testmail, planning en sendbevestiging |
| `/admin/nieuwsbrieven/[campaignId]/resultaten` | Afleveringsstatus, aggregaten en fouten |
| `/admin/email/dienstmails` | Read-only overzicht van transactionele sends en fouten |
| `/admin/email/instellingen` | Afzender, reply-to, domeinstatus en standaardfooter; alleen Admin |

De editor kan audience en controle als tabs/panelen tonen, maar de routes blijven afzonderlijk adresseerbaar. Dat voorkomt één onoverzichtelijk scherm en maakt navigatie en permissies duidelijk.

## Campagnetypes

De eerste versie kent één vrij redactioneel campagnetype:

- `newsletter`: visueel samengesteld en naar een gekozen subscriberpubliek verstuurd.

Later mogelijke types:

- `weekly_digest`: meer gestuurde artikeltemplate;
- `announcement`: korte aankondiging;
- `reengagement`: alleen na aparte juridische/productbeslissing.

Transactionele mails zijn geen campagnes en verschijnen niet in dezelfde lijst.

## Statusmodel

```text
draft
  ├─> scheduled ──> preparing ──> sending ──> sent
  │       ├─> needs_review ──> preparing
  │       └─> cancelled
  └───────────────> preparing ──> sending ──> sent
                                ├─> partially_failed
                                └─> failed
```

| Status | Bewerkbaar | Betekenis |
|--------|-----------|-----------|
| `draft` | Ja | Inhoud, onderwerp en doelgroep kunnen wijzigen |
| `scheduled` | Alleen planning | Inhoud/doelgroep zijn bevroren; tijdstip kan wijzigen, send kan vervroegd of geannuleerd worden |
| `needs_review` | Nee | Doelgroep wijkt te sterk af van de geplande preview; opnieuw bevestigen of annuleren |
| `preparing` | Nee | Ontvangerslijst wordt bevroren en jobs worden aangemaakt |
| `sending` | Nee | Resend-component verwerkt de queue |
| `sent` | Nee | Alle ontvangers hebben een finale of gequeue-de providerstatus |
| `partially_failed` | Nee | Een deel kon niet worden gequeued of eindigde definitief fout |
| `failed` | Nee | Geen geldige verzending kon worden gestart of alles faalde |
| `cancelled` | Nee | Geplande send werd vóór uitvoering geannuleerd |

Een verzonden, gedeeltelijk mislukte, mislukte of geannuleerde campagne wordt nooit teruggezet naar `draft`. **Dupliceren** maakt een nieuw concept met een nieuwe ID en schone verzendhistoriek.

Nederlandse statuslabels:

| Intern | UI |
|--------|----|
| `draft` | Concept |
| `scheduled` | Gepland |
| `needs_review` | Opnieuw controleren |
| `preparing` | Ontvangers voorbereiden |
| `sending` | Wordt verzonden |
| `sent` | Verzonden |
| `partially_failed` | Deels mislukt |
| `failed` | Mislukt |
| `cancelled` | Geannuleerd |

## Concepten

### Aanmaken

Een nieuw concept krijgt:

- interne naam: `Nieuwsbrief — [datum]`;
- leeg of standaard bodydocument;
- standaard afzender en reply-to uit e-mailinstellingen;
- geen geplande datum;
- standaardpubliek: alle actieve nieuwsbriefsubscribers;
- status `draft`;
- een eerste inhoudsversie.

### Autosave

- Wijzigingen autosaven na ongeveer 1,5–2 seconden zonder input.
- De UI toont `Opslaan…`, `Opgeslagen om HH:mm` of een duidelijke fout.
- Navigeren met onsaved wijzigingen activeert een browser-/routewaarschuwing.
- Autosave verandert alleen het actieve concept; het maakt niet bij elke toetsaanslag een permanente revisie.

### Revisies

Maak een immutable revisie:

- bij expliciet “Versie bewaren”;
- vóór een testmail;
- vóór plannen/verzenden;
- maximaal periodiek bij langdurige bewerking, bijvoorbeeld elke 15 minuten met veranderingen.

De redacteur kan een eerdere revisie bekijken en **als nieuw concept herstellen**. Een bestaande revisie wordt nooit overschreven.

### Dupliceren

Dupliceren kopieert:

- naam met suffix `(kopie)`;
- onderwerp en preheader;
- editor-document;
- gekozen template/thema;
- audiencefilters;
- afzender en reply-to.

Dupliceren kopieert niet:

- sendstatus;
- planning;
- ontvangerslijst;
- provider-ID's;
- resultaten;
- auditactoren van de bron.

## Verzonden versus “sended”

De Nederlandse UI gebruikt **Verzonden**. Intern is `sent` alleen toegestaan wanneer het voorbereidingsproces is afgerond en de verzending door het systeem is geaccepteerd. `sent` betekent niet dat elk bericht gegarandeerd in de inbox staat; delivery-, bounce- en complaintstatussen blijven per ontvanger apart.

## Standaard workflow

1. Redacteur maakt of dupliceert een concept.
2. Redacteur stelt de body visueel samen.
3. Redacteur vult interne naam, onderwerp en preheader in.
4. Redacteur controleert desktop-, mobiel- en plaintextpreview.
5. Redacteur kiest het publiek en bekijkt het berekende bereik.
6. Redacteur verstuurt minstens één testmail.
7. Controlescherm valideert ontbrekende links, footer, onderwerp en doelgroep.
8. Redacteur kiest “Nu verzenden” of een tijdstip.
9. Finale modal herhaalt naam, onderwerp, audienceomschrijving en exact aantal ontvangers.
10. Na bevestiging wordt de campagne immutable en wordt een ontvangerssnapshot gemaakt.
11. Resultatenscherm volgt queue, afleveringen en fouten.

## MVP-scope

### Vereist voor eerste bruikbare release

- adminauth en rollen;
- lijst Concepten / Gepland / Verzonden;
- visuele bodyeditor;
- onderwerp, preheader, afzender en reply-to;
- autosave en revisie vóór send;
- dupliceren;
- desktop/mobiel/plaintextpreview;
- testmail;
- audiencefilters op reeks en favoriete club;
- live audience count en uitsluitingssamenvatting;
- send now en scheduling in `Europe/Brussels`;
- immutable recipient snapshot;
- Resend-component met webhookstatussen;
- uitschrijven, preferenceslink en veilige artikellinks;
- resultatenoverzicht met delivered/bounced/complained/failed;
- audittrail.

### Bewust later

- individuele contentpersonalisatie;
- onderwerp-A/B-test;
- approval met twee verschillende personen;
- campagnearchive op publieke website;
- templatebibliotheek voor meerdere merken;
- geavanceerde automation journeys;
- resend naar alleen non-openers;
- attachments;
- AI-copygeneratie in de editor.

## Productdefaults

| Onderwerp | Aanbevolen standaard |
|-----------|----------------------|
| Taal | Nederlands (Vlaanderen) |
| Tijdzone | `Europe/Brussels`, inclusief zomer-/wintertijd |
| Afzendernaam | `De Voetbalgazet` |
| Sendmoment | Handmatig of expliciet gepland; geen automatische wekelijkse cron |
| Standaardpubliek | Alle actieve, niet-gesuppresseerde nieuwsbriefsubscribers |
| Segmentlogica | OR binnen één voorkeurtype, AND tussen verschillende voorkeurtypes |
| Inhoudspersonalisatie | Geen in MVP |
| Opens | Tonen als indicatief, niet als harde waarheid |
| Verzonden content | Immutable |
| Testmail vereist | Minstens één succesvolle test sinds laatste inhoudswijziging |

Deze defaults gelden tenzij een antwoord in [`09-open-questions.md`](./09-open-questions.md) ze vervangt.
