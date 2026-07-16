# Launch-todo's publieke nieuwssite

Dit document bevat uitgestelde gegevens en checks die niet nodig zijn om de productarchitectuur af te ronden, maar wel vóór publieke lancering ingevuld of gecontroleerd moeten worden.

## Bedrijfs- en contactgegevens

- [x] KBO-naam: YARU DAKEN (rechtsvorm: Besloten Vennootschap; weergave in copy: YARU DAKEN BV)
- [x] Maatschappelijke zetel: Van Duyststraat 60, 2100 Antwerpen, België
- [x] KBO-nummer: 1017.634.522 ([KBO Public Search](https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=1017634522))
- [x] Btw-nummer: BE 1017.634.522
- [x] Oprichting / actief sinds: 19 december 2024
- [x] Algemeen contactadres: redactie@devoetbalgazet.be
- [ ] Privacy-/supportadres
- [x] Geen telefoonnummer gepubliceerd in KBO; niet opnemen zolang geen publiek nummer gekozen is
- [x] Bestuurder: Anton Verhasselt
- [ ] Verantwoordelijke uitgever / hoofdredactie en vereiste adresvermelding
- [x] Definitieve publieke domeinnaam: devoetbalgazet.be

Werk daarna alle placeholders in [`05-privacy-and-terms-copy.md`](./05-privacy-and-terms-copy.md) bij.

## Leveranciers en privacy

- [ ] Definitieve juridische entiteiten, regio's en subverwerkers van Convex, Vercel, Resend, PostHog en R2 controleren
- [ ] Verwerkersovereenkomsten/DPA's afsluiten
- [ ] Internationale doorgiftegronden documenteren
- [x] PostHog Cloud EU project en env vars geconfigureerd (`NEXT_PUBLIC_POSTHOG_*` in Vercel + lokale dev)
- [x] PostHog Cloud EU en uitgeschakelde IP-capture ingesteld in projectinstellingen
- [ ] Retentie technisch instellen: security/errorlogs 90 dagen, analytics 24 maanden, support 24 maanden
- [ ] Supportprocedure voor inzage, correctie en volledige verwijdering testen
- [ ] Consentcopy en consentversie exact gelijk maken aan live formulier
- [ ] Belgische juridische review van de gecombineerde siteAccess + initiële nieuwsbriefinschrijving wordt aanbevolen

De juridische review is een aanbeveling en geen technische launch blocker volgens de huidige productbeslissing.

## Content en externe data

- [ ] Officiële Voetbal Vlaanderen-bron en toegestane gebruikswijze bepalen
- [ ] Club- en reekstaxonomie importeren voor artikelmetadata en voorkeuren
- [ ] Bevestigen dat geen standen, wedstrijdwidgets of clubpagina's uit VV-data in het publieke MVP komen
- [ ] Definitieve categorie-ID's/slugs vastleggen
- [ ] Redactioneel beleid voor `isGated: false` vastleggen

## E-mail en toegang

- [ ] Welkomst-/verificationmail juridisch en redactioneel nalezen
- [ ] Newsletter bootstrap-token op 30 dagen configureren
- [ ] Uitschrijven testen: `newsletterSubscribed = false`, `siteAccess` blijft behouden
- [ ] Bounce- en complaintflow testen
- [ ] Rate limiting en generieke e-mailresponses testen

## SEO en kwaliteit

- [ ] Mobile-first flows testen op 320, 360, 390 en 768 px
- [ ] Gate/keyboard/safe-area op echte iOS- en Androidtoestellen testen
- [ ] Homepage, artikel en archieffilters zonder hover/desktop-only acties controleren
- [ ] Rich Results Test voor gated en vrije artikels
- [ ] Search Console en eventuele Google News-publicatie instellen
- [ ] Sitemap, robots en excerpt-RSS valideren
- [ ] Accessibility- en keyboardtest van gate en voorkeuren
- [ ] Core Web Vitals en gate-layoutshift testen
- [ ] Open Design-assets naar een gedeeld, implementeerbaar repositorypad kopiëren
