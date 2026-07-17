# Keystatic-architectuur

## Kan Keystatic in de admin?

Ja. Keystatic is ontworpen om in een Next.js App Router-project te draaien:

```text
apps/web/src/app/keystatic/keystatic.ts
apps/web/src/app/keystatic/layout.tsx
apps/web/src/app/keystatic/[[...params]]/page.tsx
apps/web/src/app/api/keystatic/[...params]/route.ts
apps/web/keystatic.config.ts
```

Officiële integratie:

- `makePage` uit `@keystatic/next/ui/app`;
- `makeRouteHandler` uit `@keystatic/next/route-handler`;
- `@keystatic/core`;
- `@markdoc/markdoc`.

Omdat Keystatic server-side API-routes nodig heeft, is de volledige deployment niet letterlijk een pure static export. De **publieke pagina's blijven statisch gegenereerd**, terwijl Keystatic, Better Auth en e-mailcallbacks als serverroutes in dezelfde Vercel-deployment draaien.

## Routebeslissing

Gebruik de officieel gedocumenteerde UI-route `/keystatic`.

In de custom admin:

- navitem heet `Artikels`;
- `/admin/artikels` is een korte branded landings-/doorverwijspagina;
- klik opent `/keystatic`;
- Keystatic krijgt `ui.brand.name = "De Voetbalgazet"` en het echte logo;
- Keystatic-navigation groepeert `Artikels` en eventuele contentinstellingen.

We verplaatsen de catch-all niet naar een ongedocumenteerde custom base path en gebruiken geen iframe. Dit houdt OAuthcallbacks, clientrouting en upgrades voorspelbaar.

## Storage mode

### Local development

```typescript
storage: { kind: "local" }
```

- schrijft naar de lokale repository;
- geschikt voor schema- en contentontwikkeling;
- niet gebruiken als hosted production editor op Vercel, omdat serverfilesystem niet persistent is.

### Hosted

```typescript
storage: {
  kind: "github",
  repo: "AntonVerhasselt/voetbalgazet",
}
```

GitHub mode:

- vraagt GitHub-login;
- vereist write access tot repository;
- gebruikt een GitHub App;
- commit content en images naar Git;
- toont branchselectie;
- heeft Node-capable hosting nodig.

Benodigde secrets:

```text
KEYSTATIC_GITHUB_CLIENT_ID
KEYSTATIC_GITHUB_CLIENT_SECRET
KEYSTATIC_SECRET
NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG
```

## Branch- en publicatiekeuze

MVP-keuze: content wordt op de productiebranch bewaard met een expliciet `status`-veld.

- `draft`: mag in Git bestaan, publieke build sluit uit;
- `published`: publieke build neemt op;
- `archived`: publieke listings sluiten uit en routebeleid bepaalt 404/410.

Waarom geen verplichte PR per artikel:

- mobile-first editorial flow moet kort blijven;
- één of klein team;
- Git history levert rollback;
- Vercel build blijft kwaliteitsgate.

Keystatic branch mode blijft beschikbaar voor grotere wijzigingen, maar is niet verplicht in de dagelijkse flow.

## Authgrens

### Custom admin

Better Auth + adminrollen:

- newsletteradmin;
- subscribers;
- instellingen;
- adminlanding.

### Keystatic

GitHub mode gebruikt GitHub-auth en repository write permission.

We behandelen dit als bewuste dubbele grens:

- Better Auth bepaalt toegang tot custom admin;
- GitHub bepaalt wie repositorycontent mag wijzigen;
- `/admin` toont Artikels alleen voor Admin/Journalist;
- de `/keystatic` paginalayout vereist eerst een Better Auth Admin/Journalist-session;
- Viewer krijgt geen `/keystatic` of draftpreview;
- `/keystatic` vertrouwt daarna voor repositorywrite op Keystatic GitHub-auth;
- `/api/keystatic/*` gebruikt de officiële Keystatic OAuth/secretcontroles; documenteer welke callbacksubroutes niet door generieke middleware mogen worden geblokkeerd;
- Viewer krijgt geen repository write access.

Een technische spike moet aantonen dat de Better Auth page gate de officiële GitHub OAuthcallback niet breekt. We forken of herschrijven de Keystatic route handler niet.

### Cursor-agents

Een agent Better Auth-sessie (zie [`../agent-access/`](../agent-access/)) mag de page gate voor `/keystatic` openen als de rol Admin/Journalist is, maar vervangt **niet** Keystatic GitHub App-auth voor hosted writes. Agents testen artikels via `storage.kind = "local"` + git op een feature branch; zie [`../agent-access/02-keystatic-boundary.md`](../agent-access/02-keystatic-boundary.md).

## Contentlocaties

```text
apps/web/content/
├─ articles/
│  └─ {slug}.mdoc
└─ settings/
   ├─ authors.yaml
   ├─ categories.yaml
   └─ editorial.yaml

apps/web/public/
└─ images/
   └─ articles/
      └─ {slug}/...
```

Keystatic image fields gebruiken:

```typescript
directory: "public/images/articles"
publicPath: "/images/articles/"
```

De Markdoc image option gebruikt dezelfde basis.

Alle `path`/`directory`-waarden in `apps/web/keystatic.config.ts` zijn relatief aan de Next.js-app root `apps/web/`.

## Waarom artikelbeelden in Git en e-mailbeelden in R2

Keystatic biedt een ingebouwde image picker wanneer beelden naar een repositorydirectory gaan. Dat geeft de beste MVP-editorervaring en zorgt dat een artikelcommit zijn assets bevat.

- artikelbeelden: Keystatic/Git, door publieke build verwerkt;
- e-mailbeelden: React Email + Convex R2 + `media.devoetbalgazet.be`.

Dit zijn bewust twee pipelines. R2 in Keystatic integreren zou een custom field/media picker vereisen en de ingebouwde editorflow vervangen. Plan dat alleen wanneer repositorygroei of mediareuse een gemeten probleem wordt.

## Reader en publieke build

- Keystatic Reader API draait server-side/build-time;
- leest collectionentries;
- Markdoc wordt gevalideerd vóór render;
- `generateStaticParams` gebruikt alleen published entries;
- homepage, archief, sitemap, RSS en searchindex gebruiken dezelfde readerlaag;
- build faalt bij invalide metadata, duplicate slug of ongeldige Markdoc.

## Preview

Gebruik Keystatic `previewUrl` met Next.js draft mode:

```text
/preview/start?branch={branch}&to=/nieuws/{slug}
```

Preview:

- vereist een Better Auth Admin/Journalist-session;
- gebruikt een kortlevend ondertekend previewrequest;
- zet een veilige HttpOnly draft-modecookie;
- accepteert alleen branchnamen onder de geconfigureerde Keystatic branchscope en een allowlisted `/nieuws/...` return path;
- leest de gekozen branch/draftcontent;
- toont exacte publieke artikeltemplate;
- toont gate states via previewcontrols zonder echte subscriberdata;
- heeft een duidelijke `Preview`-banner;
- kan draft mode beëindigen;
- mag niet geïndexeerd of gecached worden.

## Security

- GitHub App alleen op deze repository;
- minimale repositorypermissions;
- secrets alleen server-side;
- redirect URI exact voor productie/previewdomains;
- Keystatic API rate limiting waar praktisch;
- preview start/end met CSRF/origincheck, kortlevende signature en return URL allowlist;
- geen branch-/filepath rechtstreeks uit onbetrouwbare URL gebruiken;
- `/keystatic` en `/preview/*` `noindex`;
- audit via Git commits plus admin securitylogs.

## Upgradegrens

Keystatic APIs en routepatronen moeten bij implementatie tegen de actuele versie worden gevalideerd. De plannen gebruiken officiële concepten, geen gepinde packageversie.
