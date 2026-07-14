# Analytics, compliance en operations

## Doel

De nieuwsbriefoperatie moet meetbaar zijn zonder opens als absolute waarheid te behandelen of onnodig persoonsgegevens naar PostHog te sturen.

Er zijn drie databronnen:

1. Convex appstate: campagnes, audiences, recipients, audit;
2. Resend deliverywebhooks: sent, delivered, bounced, complained, opened, clicked;
3. PostHog: adminproductgebruik en newsletter-to-site gedrag zonder raw e-mail/tokens.

## Campaignstatistieken

### Betrouwbaar

- selected recipients;
- suppressed before queue;
- queued;
- provider sent;
- delivered;
- bounced;
- complained;
- failed;
- unsubscribed na campagne;
- veilige article bootstrap callback;
- artikelunlock en read depth op publieke site.

### Indicatief

- opens;
- unieke opens;
- open rate;
- clicks als providertracking linkwrapping gebruikt;
- click rate.

Open tracking wordt beïnvloed door Apple Mail Privacy Protection, image blocking, bots en proxy's. UI-label:

> Openingen zijn een schatting en kunnen door privacyfuncties automatisch worden geregistreerd.

Voor redactionele impact zijn veilige article-link callbacks en daadwerkelijke site-events waardevoller.

## Definities

Documenteer formules:

```text
delivery_rate = delivered / queued
bounce_rate = bounced / queued
complaint_rate = complained / queued
unsubscribe_rate = campaign_attributed_unsubscribes / delivered
unique_click_rate = unique_human_clicks / delivered
```

Noem `queued` niet “verzonden naar inbox”. Toon absolute aantallen naast percentages.

## Bot- en scannerverkeer

- Link-scanners kunnen clicks veroorzaken.
- Unsubscribe via GET mag daarom niet direct muteren; RFC one-click POST wel.
- Markeer bekende bot/scanner clicks indien Resend metadata dat ondersteunt.
- Article bootstrap moet veilig zijn wanneer een scanner de link bezoekt: maak niet automatisch een duurzame browser-session zonder passende browsercontext/redirectflow.
- PostHog events op landing geven betere human signalen dan provider click alleen.

## PostHog admin-events

Geen autocapture in recipienttabellen of editorvelden.

| Event | Wanneer | Veilige properties |
|-------|---------|---------------------|
| `newsletter_campaign_created` | Concept aangemaakt | `source` (`blank` of `duplicate`) |
| `newsletter_campaign_duplicated` | Duplicatie | `source_status` |
| `newsletter_revision_saved` | Revisie | `reason`, `block_count_bucket` |
| `newsletter_preview_opened` | Preview | `mode` |
| `newsletter_test_requested` | Test | `recipient_count`, `revision_is_current` |
| `newsletter_test_completed` | Resultaat | `status`, `error_code?` |
| `newsletter_audience_previewed` | Bereik klaar | `division_count`, `team_count`, `audience_size_bucket` |
| `newsletter_send_scheduled` | Planning | `lead_time_bucket`, `audience_size_bucket` |
| `newsletter_send_confirmed` | Finale confirm | `send_mode`, `audience_size_bucket` |
| `newsletter_send_completed` | Backend resultaat | `status`, `recipient_count_bucket`, `failure_rate_bucket` |
| `newsletter_editor_error` | Editor/renderfout | `error_code`, `editor_version` |

Niet naar PostHog:

- subject/body/preheader;
- e-mailadressen;
- subscriber- of recipient-ID's;
- tokens;
- volledige campaign-ID als dat onnodig is;
- externe URL's met querystrings.

## Newsletter-to-site events

Bestaande publieke events blijven:

- `newsletter_article_link_opened`;
- `subscriber_session_verified`;
- `article_body_unlocked`;
- `article_read_depth_reached`;
- `newsletter_unsubscribed`;
- `preferences_updated`.

Veilige properties:

- campaign analytics ID (random, niet direct subscribergekoppeld);
- article ID;
- link position/block type;
- token age bucket;
- category/division;
- geen recipient ID.

## Privacy en rechtsgrond

### Marketingmail

- gebaseerd op de expliciete gecombineerde inschrijving uit het publieke plan;
- bewijs: consentversion, bron en timestamp;
- gratis unsubscribe in elke nieuwsbrief;
- unsubscribe verandert siteAccess niet;
- suppression blijft bewaard om keuze te respecteren.

### Dienstmail

Elk visueel beheerd transactioneel e-mailtype krijgt metadata:

- purpose;
- trigger;
- marketing: false;
- vereiste site/accountstatus;
- rechtsgrondnotitie;
- eigenaar;
- actieve editorversie en gebruikte systeemvariabelen.

Gebruik dienstmail niet voor promotionele inhoud aan uitgeschreven subscribers.

### Tracking

**Bevestigde productbeslissing:** activeer alle door Resend ondersteunde tracking voor nieuwsbriefcampagnes, inclusief opens en clicks, naast delivery-, bounce-, complaint- en failure-events.

Randvoorwaarden:

- documenteer open- en clicktracking expliciet in de privacyverklaring;
- label opens altijd als indicatief wegens Apple Mail Privacy Protection, proxies, bots en image blocking;
- gebruik first-party article callbackmetingen als sterker redactioneel signaal;
- behandel clicks op auth-, voorkeuren- en uitschrijflinks niet als redactionele engagement, ook wanneer de provider ze technisch registreert;
- stuur geen raw tokens of recipientidentificatie naar PostHog;
- verifieer de actuele Resend trackinginstellingen en webhookevents vóór production.

## Dataretentie

Aanbevolen technisch beleid, nog juridisch te valideren:

| Data | Retentie |
|------|----------|
| Campagnecontent en finale revisie | Onbeperkt als redactioneel archief, totdat redactiebeleid anders bepaalt |
| Niet-verzonden draft en revisies | Laatste 90 dagen actief; oude niet-gelabelde revisies na 90 dagen opruimen |
| Campaignaggregaten | 24 maanden operationeel; daarna eventueel geanonimiseerd |
| Recipient mapping naar subscriber | 24 maanden |
| Delivery eventdetails | 90 dagen |
| Resend component finalized records | 30 dagen |
| Resend abandoned records | 90 dagen |
| Audit events | 24 maanden, securityrelevante events volgens beleid |
| Active suppressions | Zolang nodig om unsubscribe/complaint/bounce te respecteren |
| Testmailhistoriek | 90 dagen |
| R2-assets gebruikt in verzonden e-mail | Bewaren zolang de verzonden e-mail als redactioneel archief behouden blijft |
| Ongebruikte draftassets | Opruimen na aanbevolen 90 dagen, alleen na referentiecheck |

Bij subscriberverwijdering:

- verwijder persoonlijke profieldata;
- revoke sessies/tokens;
- recipientrecords worden verwijderd of losgekoppeld/gepseudonimiseerd;
- campagneaggregaten blijven;
- minimale suppression-HMAC kan blijven wanneer juridisch noodzakelijk om niet opnieuw te mailen;
- audit blijft zonder raw e-mail.

## Compliancecopy en footer

Elke nieuwsbrief bevat:

- afzender De Voetbalgazet;
- waarom de ontvanger de mail krijgt;
- fysieke/editoriale contactgegevens;
- privacylink;
- voorkeurenlink;
- zichtbare uitschrijflink;
- eventueel verantwoordelijke uitgever volgens juridisch advies.

Bedrijfs-, KBO-, adres- en contactplaceholders uit het publieke launchplan zijn blocker voor echte live sends.

## Deliverability

Vóór production:

- verified sending domain;
- SPF;
- DKIM;
- DMARC met gemonitord beleid;
- consistent From-domein;
- werkend Reply-To;
- geen noreply tenzij noodzakelijk;
- complaint/bounce webhook;
- List-Unsubscribe + one-click;
- gecontroleerde HTML/text multipart;
- test Gmail, Outlook, Apple Mail en mobiele clients;
- geleidelijke warm-up als lijst groot is;
- geen gekochte of geïmporteerde lijst zonder bewijs van consent.

Bevestigde afzenderstrategie:

- sending domain: `nieuws.devoetbalgazet.be`;
- één primaire divisie: `{{division-slug}}@nieuws.devoetbalgazet.be`;
- meerdere divisies of volledig publiek: `redactie@nieuws.devoetbalgazet.be`;
- zichtbaar From name bij één divisie: `De Voetbalgazet — {{Divisionnaam}}`;
- zichtbaar From name bij meerdere/alle divisies: `De Voetbalgazet`;
- Reply-To: `redactie@devoetbalgazet.be`;
- transactionele mails: `De Voetbalgazet <redactie@nieuws.devoetbalgazet.be>`.

Het volledige subdomein krijgt SPF, DKIM en DMARC. Divisienamen worden altijd als stabiele ASCII-slug gebruikt in het adres.

## Monitoring

### Dashboard

- sends preparing/sending langer dan verwachte drempel;
- queue backlog;
- failed render jobs;
- webhook signature failures;
- unmatched provider events;
- bounce rate;
- complaint rate;
- unsubscribe spike;
- scheduler misses;
- Resend component abandoned emails;
- cleanup failures.

### Alerts

Aanbevolen:

- Critical: complaint rate boven interne drempel, sender config ongeldig, dubbele send gedetecteerd;
- Warning: bounce rate > 2%, failure rate > 1%, scheduled send gemist, webhook 15 min stil tijdens active send;
- Info: send voltooid, countafwijking vereist review.

Exacte thresholds na eerste campagnes baselinen. Hard-coded industrybenchmarks zijn geen vervanging voor eigen lijstkwaliteit.

## Noodstop

Voorzie server-side marketing kill switch:

- blokkeert nieuwe live campaign enqueue;
- blokkeert geen noodzakelijke auth/securitydienstmail;
- alleen Admin kan status wijzigen;
- wijziging vereist reden en audit;
- active sends stoppen alleen waar componentcancel nog veilig mogelijk is.

Geen “stop alles”-knop beloven nadat provider de mail accepteerde.

## Incidentprocedures

### Verkeerd publiek vóór enqueue

- cancel scheduled/preparing wanneer nog claimbaar;
- audit;
- corrigeer audience;
- dupliceer of herplan.

### Verkeerde inhoud tijdens send

- active queue best-effort cancel waar component dit ondersteunt;
- marketing kill switch;
- bepaal reeds sent count;
- geen blind correctiemail;
- redactionele incidentbeslissing;
- documenteer recipients en tijdslijn.

### Bounce/complaint spike

- pauzeer nieuwe marketingmail;
- controleer consentbron en lijstwijzigingen;
- controleer domain auth;
- suppress affected;
- contacteer provider indien nodig;
- hervat alleen na oorzaak.

### Webhook outage

- sends blijven via component queue lopen;
- admin toont status “updates vertraagd”;
- reconcile componentstatus/providerstatus;
- herstel events idempotent;
- geen resend enkel wegens ontbrekende webhook.

## Teststrategie

### Unit

- filterlogica;
- statusmachine;
- token purpose/expiry;
- suppressionprioriteit;
- monotone deliverystatus;
- validator en sanitizer;
- linktransformatie;
- plaintext.

### Convex

- role wrappers;
- indexed queries;
- pagination;
- recipient dedupe;
- retry/idempotency;
- scheduled claim generation;
- webhook dedupe/out-of-order;
- subscriber projection consistency.

### E-mail snapshots

- vrije editoroutput; bij nieuwsbriefcampagnes aangevuld met vaste compliancefooter;
- standaardblokken;
- transactionele systeemvariabelen;
- R2/CDN-afbeeldingen;
- dark mode fallbacks;
- long headlines;
- ontbrekend beeld;
- Unicode/Nederlandse accenten;
- Gmail clipping threshold;
- plaintext.

### End-to-end

1. concept aanmaken;
2. autosave;
3. conflict;
4. dupliceren;
5. publiek filteren;
6. testmail;
7. send confirm;
8. provider webhook;
9. result update;
10. unsubscribe;
11. preference change;
12. bounce/complaint suppression;
13. schedule/cancel/DST.

### Destructieve sendtests

Development/staging gebruiken uitsluitend testMode en allowlisted testadressen. Een productie-smoketest start met een expliciet intern publiek en vereist dezelfde finale confirm als een echte campagne.

## Operationele acceptatie

- Privacycopy beschrijft werkelijke tracking.
- Footer bevat alle vereiste gegevens.
- SPF/DKIM/DMARC en webhook zijn geverifieerd.
- Retentiecleanup draait en is getest.
- Alerts werken met gesimuleerde fouten.
- Kill switch is getest.
- Resultaten onderscheiden queue, sent en delivered.
- Opens zijn als indicatief gelabeld.
- Subscriber deletion verwijdert of pseudonimiseert recipientlinkage.
