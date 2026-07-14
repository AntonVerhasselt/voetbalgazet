# Publieke nieuwssite — verfijnd plan

Dit dossier is de bron van waarheid voor het publieke, lezersgerichte deel van De Voetbalgazet. Het adminplatform en de nieuwsbriefproductie vallen buiten deze scope.

## Documenten

| Document | Inhoud |
|----------|--------|
| [01-product-decisions.md](./01-product-decisions.md) | Bevestigde productkeuzes, routes en MVP-scope |
| [02-access-and-auth.md](./02-access-and-auth.md) | Inschrijving, onmiddellijke toegang, Better Auth en sessies |
| [03-static-content-and-seo.md](./03-static-content-and-seo.md) | Volledig statische artikels, soft gate, SEO, social en RSS |
| [04-public-ux-and-analytics.md](./04-public-ux-and-analytics.md) | Publieke flows, voorkeuren en PostHog-meetplan |
| [05-privacy-and-terms-copy.md](./05-privacy-and-terms-copy.md) | Korte Nederlandstalige conceptteksten voor privacy en voorwaarden |

De oudere hoofdpagina [`../01-news-site.md`](../01-news-site.md) blijft het architecturale overzicht en verwijst voor details naar dit dossier.

## Kernbeslissing

De publieke site is statisch opgebouwd en voor iedereen gelijk. De artikelgate is een **registratiegate**, geen betaalmuur of harde beveiligingsgrens:

- de volledige artikel-HTML wordt tijdens de build gegenereerd en via de CDN geleverd;
- bezoekers zien titel, intro, hoofdbeeld, metadata en een lead-in;
- de rest wordt door een client-side gate afgedekt;
- een geldige 90-dagensessie verwijdert de gate;
- een technisch onderlegde bezoeker kan een soft gate omzeilen. Dat is aanvaardbaar omdat toegang gratis is en het doel e-mailinschrijving is;
- als later echte contentbescherming nodig is, moet de volledige tekst of een decryptiesleutel pas na server-side entitlementcontrole worden geleverd. Dat is bewust geen MVP-eis.

## Belangrijke veiligheidsgrens

Een bekend e-mailadres is **geen bewijs van identiteit**. Op een nieuw apparaat mag het invoeren van een bestaand adres daarom wel meteen een laaggeprivilegieerde leessessie geven, maar nooit:

- de bestaande Better Auth-gebruiker overnemen;
- opgeslagen voorkeuren tonen of wijzigen;
- sessies beheren;
- persoonlijke gegevens teruggeven.

Een magic link of veilige link uit de nieuwsbrief koppelt het apparaat pas daarna aan de geverifieerde subscriberidentiteit. Zo blijft lezen frictieloos zonder e-mailkennis als authenticatie te behandelen.

## Juridische status

De juridische teksten zijn werkconcepten op basis van Belgische/EU-richtlijnen, geen juridisch advies. Voor lancering moeten bedrijfsidentiteit, KBO/btw-gegevens, verantwoordelijke uitgever, bewaartermijnen en de precieze rechtsgrond door een Belgische jurist of privacyprofessional worden nagekeken.
