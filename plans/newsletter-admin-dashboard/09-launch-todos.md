# Launch-todo's nieuwsbriefadmin

Alle product- en architectuurvragen voor het MVP zijn beantwoord. Dit document bevat alleen concrete inputs, configuratie en controles die vóór echte productie-e-mail nog moeten gebeuren.

## Externe diensten — basisconfiguratie voltooid (16 jul 2026)

De volgende provider-setup is afgerond (secrets staan in Convex/Vercel, niet in git):

| Dienst | Status | Notities |
|--------|--------|----------|
| **Resend** | ✅ | Sending domain `nieuws.devoetbalgazet.be` verified; `RESEND_API_KEY` + `RESEND_WEBHOOK_SECRET` in Convex (dev + prod); webhooks op `{CONVEX_SITE_URL}/resend-webhook` |
| **Cloudflare R2** | ✅ | Bucket `voetbalgazet-bucket`; `R2_*` env vars in Convex (dev + prod); custom domain `media.devoetbalgazet.be` **Active** |
| **PostHog** | ✅ | PostHog Cloud EU; `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com` in Vercel + lokale dev |
| **DNS / redactie-mail** | ✅ | DNS via Cloudflare; `redactie@devoetbalgazet.be` ontvangt via Email Routing → Gmail; verzenden via Gmail send-as; root SPF bijgewerkt |

Nog open vóór code-implementatie: `EMAIL_TOKEN_SECRET` en `EMAIL_ADDRESS_HMAC_SECRET` in Convex (dev + prod).

## Bedrijfs- en footergegevens

- [x] KBO-naam: YARU DAKEN (rechtsvorm: Besloten Vennootschap; weergave in copy: YARU DAKEN BV)
- [x] Fysiek/maatschappelijk adres: Van Duyststraat 60, 2100 Antwerpen, België
- [x] KBO 1017.634.522 en btw BE 1017.634.522 ([KBO Public Search](https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=1017634522))
- [x] Oprichting / actief sinds: 19 december 2024
- [x] Bestuurder: Anton Verhasselt
- [x] Redactiecontact: redactie@devoetbalgazet.be
- [ ] Privacy-/supportcontact definitief bevestigen
- [ ] Verantwoordelijke uitgever vermelden waar juridisch vereist
- [ ] Privacy- en voorwaarden-URL's definitief bevestigen
- [ ] Vaste campagnefooter met `Uitschrijven` en `Voorkeuren aanpassen` juridisch/copytechnisch nalezen

Deze gegevens zijn bewust uitgesteld. Production campaign sending blijft geblokkeerd zolang de footer placeholders bevat.

## E-maildomein en deliverability

Bevestigde adressen:

- sending domain: `nieuws.devoetbalgazet.be`;
- één divisie: `{{division-slug}}@nieuws.devoetbalgazet.be`;
- meerdere/alle divisies: `redactie@nieuws.devoetbalgazet.be`;
- Reply-To: `redactie@devoetbalgazet.be`;
- transactioneel: `redactie@nieuws.devoetbalgazet.be`.

Launchchecks:

- [x] `nieuws.devoetbalgazet.be` als Resend sending domain configureren
- [x] SPF valideren
- [x] DKIM valideren
- [ ] DMARC instellen en rapportage opvolgen
- [x] Reply-To mailbox operationeel en gemonitord (`redactie@devoetbalgazet.be` via Cloudflare Email Routing + Gmail)
- [x] Resend API key in Convex environment (dev + prod)
- [x] Resend webhook op `{CONVEX_SITE_URL}/resend-webhook` (pad `/resend-webhook`)
- [x] Resend webhook secret als `RESEND_WEBHOOK_SECRET` in Convex environment (dev + prod)
- [x] Alle vereiste delivery/webhookeventtypes activeren (`email.*`)
- [ ] Open- en clicktracking activeren
- [ ] Opens in admin als indicatief labelen
- [ ] `List-Unsubscribe` en RFC 8058 `List-Unsubscribe-Post` testen
- [ ] Gmail, Outlook en Apple Mail inbox-/spamtests uitvoeren

## R2 en e-mailbeelden

Bevestigde mediahost: `media.devoetbalgazet.be`.

- [x] Aparte/gepaste Cloudflare R2 bucket configureren (`voetbalgazet-bucket`)
- [x] Restricted R2 API token aanmaken
- [x] R2 secrets alleen in Convex environment instellen (dev + prod)
- [x] Custom domain `media.devoetbalgazet.be` koppelen (status Active)
- [ ] CORS beperken tot development, staging en production admin origins
- [ ] Cacheheaders voor e-mailbeelden controleren
- [ ] JPEG, PNG, WebP en GIF testen
- [ ] Limiet 5 MB afdwingen
- [ ] Animated-GIF size/clientwaarschuwing tonen
- [ ] Verifiëren dat sent-email assets niet door cleanup worden verwijderd

## Adminrollen en operationele ontvangers

- [ ] Eerste Adminaccounts bepalen
- [ ] Eerste Journalistaccounts bepalen
- [ ] Vieweraccounts indien nodig
- [ ] Bevestigen dat alleen Admin transactionele e-mails kan wijzigen, testen, publiceren, uitschakelen en terugrollen
- [ ] Interne testmailadressen configureren
- [ ] Failure alerts naar alle Admins en initiërende Journalist testen
- [ ] Dedupe wanneer initiator zelf Admin is

## Transactionele e-mails

Voor elk type:

- [ ] Welcome
- [ ] Magic link
- [ ] Verify email
- [ ] Preferences changed
- [ ] Unsubscribe confirmed, indien productmatig gewenst
- [ ] Admin send alert

Per type:

- [ ] Allowed en required systeemvariabelen vastleggen
- [ ] Visuele inhoud in admin maken
- [ ] Preview met dummydata controleren
- [ ] Succesvolle testmail uitvoeren
- [ ] Eerste actieve versie als Admin publiceren
- [ ] Triggerflow end-to-end testen zonder echte token in logs/UI

## Privacy en retentie

- [ ] Privacyverklaring actualiseren voor open-, click- en deliverystatus
- [ ] Open tracking en providerlinktracking juridisch/privacytechnisch bevestigen
- [ ] Campagnecontent als redactioneel archief documenteren
- [ ] Verzonden campagnecontent zonder automatische vervaldatum bewaren
- [ ] Recipientmappingretentie op 24 maanden configureren
- [ ] Campagneaggregaten op 24 maanden configureren of daarna anonimiseren
- [ ] Audit events op 24 maanden configureren
- [ ] Deliveryevents na 90 dagen opruimen
- [ ] Resend finalized records na 30 dagen opruimen
- [ ] Resend abandoned records na 90 dagen opruimen
- [ ] Testmailhistoriek na 90 dagen opruimen
- [ ] Ongebruikte draftrevisies/assets na 90 dagen en referentiecheck opruimen
- [ ] R2-assets gebruikt in verzonden e-mail bewaren zolang de campagne als archief behouden blijft
- [ ] Suppressions bewaren zolang nodig om unsubscribe/bounce/complaint te respecteren
- [ ] Subscriber deletion/pseudonymization end-to-end testen

## Audience en schaal

- [ ] `subscriberDivisionPreferences` projectie bouwen en controleren
- [ ] Dry-run van bestaande subscriberprojectie uitvoeren vóór writes
- [ ] OR-binnen / AND-tussen filtertests
- [ ] Clubfilter sluit subscriber zonder favoriete club uit
- [ ] Unverified single-opt-in subscriber blijft eligible
- [ ] Default `Alle actieve abonnees` vereist expliciete confirm
- [ ] Scheduled snapshot gebruikt actuele recipients op sendmoment
- [ ] Countverschil stopt de send niet en verschijnt in audit/resultaat
- [ ] Loadtest met minstens 100.000 subscribers
- [ ] Convex- en Resendquotas vóór grotere productieschaal controleren

## Sending en recovery

- [ ] Production environment guard testen
- [ ] Marketing kill switch testen
- [ ] Dubbelklik/idempotency testen
- [ ] Resend outage en retry simuleren
- [ ] Scheduled send in `Europe/Brussels` inclusief DST testen
- [ ] Cancel en send-now override van schedule testen
- [ ] Manual recovery alleen Admin
- [ ] Recovery alleen bij definitieve app-level failure
- [ ] Bounce, complaint en unsubscribe nooit retryen
- [ ] Onzekere providerstatus blokkeert recovery
- [ ] Suppression opnieuw controleren vóór recovery

## Pilot en launch

- [ ] Newsletteradmin volledig testen op 320, 360, 390 en 768 px
- [ ] Editor toolbar/drawers met virtueel keyboard testen
- [ ] E-mail preview in 320/375 px en echte mobiele inboxclients testen
- [ ] Vaste footerlinks minimaal 44 px tapbaar en zonder overflow
- [ ] HTML-grootte/Gmail clipping controleren
- [ ] Interne production-smoketest
- [ ] Kleine echte pilot naar gecontroleerd publiek
- [ ] Delivery-, bounce-, complaint-, open- en clickresultaten controleren
- [ ] Uitschrijf- en voorkeurenlinks uit echte inbox testen
- [ ] Footer/legal placeholders volledig verwijderd
- [ ] Alerts en runbooks doorlopen
- [ ] Pas daarna volledige actieve lijst vrijgeven
