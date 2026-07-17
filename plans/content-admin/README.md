# Artikeladmin met Keystatic

Dit dossier is de bron van waarheid voor artikelbewerking en -publicatie.

## Beslissingen

1. Keystatic draait in dezelfde Next.js-app als de publieke site en nieuwsbriefadmin.
2. Hosted editing gebruikt Keystatic GitHub mode.
3. Git/Keystatic is de bron van waarheid voor artikelcontent.
4. Convex bevat geen tweede artikelbody of publicatiestatus.
5. Publieke pagina's worden statisch gegenereerd uit repositorycontent.
6. De admin is mobile-first; iedere essentiële actie moet op 320–375 px bruikbaar zijn.
7. Artikelbeelden gebruiken voor het MVP Keystatic image fields in de repository.
8. Nieuwsbriefcontent blijft volledig los van artikels.

## Documenten

| Document | Inhoud |
|----------|--------|
| [01-keystatic-architecture.md](./01-keystatic-architecture.md) | Next.js-routes, GitHub mode, auth, storage en preview |
| [02-article-model-and-publishing.md](./02-article-model-and-publishing.md) | Fields, contentvalidatie, draft/publish en statische build |
| [03-admin-ui-ux.md](./03-admin-ui-ux.md) | Mobile-first adminflows, Keystatic-branding en foutstaten |
| [04-launch-todos.md](./04-launch-todos.md) | GitHub App, assets, contentdata en launchchecks |
| [05-taxonomies-and-settings.md](./05-taxonomies-and-settings.md) | Stabiele keys en synccontract voor reeksen, clubs, categorieën en auteurs |

Na merge: operationele restpunten staan in [`docs/phase-3-follow-ups.md`](../../docs/phase-3-follow-ups.md).

## Waarom geen Convex-artikelkopie

Een dubbele contentbron zou synchronisatieproblemen introduceren:

- Keystatic commit zegt published, Convex zegt draft;
- een build leest andere tekst dan de admin;
- rollback vereist twee systemen;
- mediareferenties lopen uiteen.

Daarom:

- Git commit history levert versiegeschiedenis;
- Keystatic beheert schema en contentbestanden;
- Vercel bouwt direct uit de repository;
- Convex beheert alleen de functies waarvoor het wél bron van waarheid is: subscribers, e-mail, adminappstatus en toegang.

## Bekende Keystatic-UX-grens

Keystatic ondersteunt:

- brandnaam/logo;
- gegroepeerde navigatie;
- Nederlandse labels;
- `entryLayout: "content"` voor focus op Markdocbody;
- preview URL's;
- image pickers.

Het is geen volledig themeable custom admin. We nemen de ingebouwde editor als productgrens voor het MVP en testen hem expliciet mobiel. Als een blocker niet via config/schema kan worden opgelost, wordt die als afzonderlijke custom-adminbeslissing gepland in plaats van Keystatic intern te forken.
