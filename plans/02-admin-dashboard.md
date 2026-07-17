# Component 2 — Content- en nieuwsbriefadmin

## Scope

Het interne adminplatform heeft voorlopig twee functies:

1. nieuwsartikels schrijven en publiceren met Keystatic;
2. nieuwsbrieven en transactionele e-mails beheren via de custom Convex-admin.

Gedetailleerde dossiers:

- [`content-admin/`](./content-admin/) — Keystatic, artikelmodel, publicatie en admin-UX;
- [`newsletter-admin-dashboard/`](./newsletter-admin-dashboard/) — visuele e-maileditor, audiences, sends en operations;
- [`ui-ux/`](./ui-ux/) — gedeelde mobiele designregels voor publieke site, admin en e-mail.

## Beslissing: één Next.js-app, twee geïntegreerde adminoppervlakken

```text
devoetbalgazet.be
├─ publieke statisch gegenereerde routes
├─ /admin
│  ├─ overzicht en gedeelde navigatie
│  ├─ /admin/nieuwsbrieven
│  ├─ /admin/abonnees
│  └─ link naar Artikels
└─ /keystatic
   └─ Keystatic artikelbeheer in dezelfde Next.js-deployment
```

Keystatic kan technisch in dezelfde Next.js-app draaien via:

- `@keystatic/next/ui/app` voor de adminpagina;
- `@keystatic/next/route-handler` voor `/api/keystatic/*`;
- GitHub storage mode voor hosted editing;
- de Keystatic Reader API tijdens build/preview.

De officiële en minst risicovolle route blijft `/keystatic`. In de gedeelde adminnavigatie heet deze bestemming **Artikels**. We forceren Keystatic niet in een iframe en kopiëren zijn editor niet. De UI krijgt wel De Voetbalgazet-naam/logo en Nederlandstalige labels waar Keystatic dit via `ui.brand`, collections en navigation ondersteunt.

## Waarom Keystatic wel in de admin past

| Behoefte | Invulling |
|----------|-----------|
| Artikel schrijven | Markdoc rich-content field |
| Metadata | Typed Keystatic fields |
| Afbeeldingen | Keystatic image fields |
| Versiegeschiedenis | Git commits |
| Hosted editing | GitHub mode + GitHub App |
| Preview | `previewUrl` + Next.js draft mode |
| Publicatie | `status = published` opslaan; Git commit triggert Vercel build |
| Mobiel beheer | Responsive Keystatic UI valideren op 320/375 px; geen desktop-only workflow accepteren |

Belangrijke beperking: Keystatic is een eigen adminapp met beperkte theming. We kunnen branding en contentstructuur aanpassen, maar niet garanderen dat elk intern component exact de Open Design-vormtaal volgt. Als mobiele gebruikstests aantonen dat Keystatic onvoldoende is, bouwen we later een custom editor boven hetzelfde filemodel; dit is geen MVP-aanname.

## Contentbron

Keystatic/Git is de enige bron van waarheid voor artikelcontent.

- Artikels staan als Markdoc + frontmatter in `apps/web/content/articles/`.
- Artikelbeelden staan voor het MVP via Keystatic in `apps/web/public/images/articles/`.
- Convex bewaart geen tweede kopie van artikelbody of publicatiestatus.
- Convex blijft bron van waarheid voor subscribers, nieuwsbriefoperaties en adminappdata.
- De publieke build leest Keystaticcontent rechtstreeks uit de repository.

Deze beslissing vervangt het eerdere concept waarin Convex content snapshots naar een Vercel deploy hook stuurde. Een Keystatic-save maakt een Git commit; de repositorywijziging triggert de Vercel build.

## Hosted storage en authenticatie

### Development

- `storage.kind = "local"` is toegestaan voor lokale contentontwikkeling;
- wijzigingen schrijven rechtstreeks naar de werkdirectory;
- geen productiecontent vanuit een tijdelijke cloudagent aanpassen.

### Hosted admin

- `storage.kind = "github"`;
- GitHub App krijgt alleen toegang tot de relevante repository;
- gebruikers hebben GitHub write access nodig;
- secrets:
  - `KEYSTATIC_GITHUB_CLIENT_ID`;
  - `KEYSTATIC_GITHUB_CLIENT_SECRET`;
  - `KEYSTATIC_SECRET`;
  - `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`.

Keystatic GitHub-auth is noodzakelijk voor repositorywrites. De custom newsletteradmin gebruikt Better Auth. De `/admin`-homepage toont alleen links waarvoor de gebruiker toegang heeft; Keystatic voert daarnaast zijn eigen GitHub-autorisatie uit. We vermijden een fragiele eigen wrapper rond de Keystatic API.

### Cursor Cloud Agents

Menselijke redactie blijft GitHub OAuth gebruiken. Cursor-agents krijgen een aparte agenttoegangspoort die een normale Better Auth-sessie uitgeeft zonder GitHub 2FA. Die sessie dekt de custom Convex-admin; hosted Keystatic GitHub-writes blijven daarbuiten. Details: [`agent-access/`](./agent-access/).

## Rollen

| Rol | Nieuwsbriefcampagnes | Transactionele e-mail | Artikels |
|-----|----------------------|-----------------------|----------|
| Admin | Volledig | Volledig | GitHub write access |
| Journalist | Maken/testen/versturen | Read-only | GitHub write access |
| Viewer | Read-only | Read-only | Geen Keystatic write access |

GitHub repositoryrechten zijn voor artikelwrites leidend. Better Auth-rollen en GitHubrechten moeten operationeel op elkaar afgestemd worden.

## Adminnavigatie

Mobiel primair:

- compacte topbar met logo en account;
- primaire bestemmingen als grote tap targets;
- onder 768 px een bottom navigation of menu sheet:
  - Overzicht;
  - Artikels;
  - Nieuwsbrieven;
  - Abonnees;
- instellingen alleen voor Admin;
- geen hover-only acties;
- actieve omgeving/status duidelijk zichtbaar.

Desktop:

- smalle zijbalk of mastheadnav;
- dezelfde informatietopologie als mobiel;
- geen aparte functies die alleen op desktop bestaan.

## Publicatieflow in hoofdlijnen

1. Journalist opent Artikels vanuit `/admin`.
2. Keystatic vraagt GitHub-auth indien nodig.
3. Journalist maakt of bewerkt een artikel.
4. Preview opent de publieke artikelroute in Next.js draft mode.
5. Draft wordt opgeslagen als Git commit met `status: draft`.
6. Publiceren zet status en datum expliciet op `published`.
7. Git commit triggert Vercel.
8. Build valideert content en genereert publieke pagina's.
9. Alleen succesvolle build wordt live.

Er is geen automatische overdracht van artikelcontent naar een nieuwsbrief. Nieuwsbrieven worden volledig custom gemaakt.

## UI-bron

Gedeelde bron:

```text
/Users/antonverhasselt/Library/Application Support/Open Design/namespaces/release-stable-intel/data/projects/a132ea15-213e-409f-9e25-e762711453c3
```

Relevante bestanden:

- `brand-spec.md` en `styles.css`: tokens, typography, spacing, rules;
- `homepage.html`: masthead en mobile public navigation;
- `article.html`: artikeltypografie en contentritme;
- `article-gate.html`: sheets, focus en mobile formuliergedrag;
- `subscribe.js`: chips, stappen en preferenceinteracties.

Deze cloudomgeving kon de lokale Open Design-map opnieuw niet lezen. Kopieer de bronbestanden en assets naar `design/open-design/` in de repository vóór visuele implementatie. Tot dan zijn de bestaande beschrijvingen richtinggevend, niet pixel-perfect geverifieerd.

## MVP

- [ ] Gedeelde mobile-first adminlanding en navigatie
- [ ] Better Auth voor custom adminroutes
- [ ] Keystatic in dezelfde Next.js-app
- [ ] Keystatic GitHub mode en GitHub App
- [ ] Artikelcollection met volledig schema
- [ ] Markdoc editor en ingebouwde images
- [ ] Draft mode preview
- [ ] Draft/published publicatieflow
- [ ] Vercel buildvalidatie
- [ ] Newsletteradmin volgens verfijnd dossier
- [ ] Mobile acceptance op 320, 375 en 768 px

## Niet in huidige scope

- automatische nieuwsbriefcuratie;
- realtime collaborative editing;
- custom vervanging van Keystatic UI.
