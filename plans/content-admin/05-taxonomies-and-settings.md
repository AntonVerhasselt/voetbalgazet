# Gedeelde taxonomieën en contentinstellingen

## Waarom een contract nodig is

Reeksen, clubs, categorieën en auteurs worden gebruikt door verschillende systemen:

- publieke signup en `/voorkeuren`;
- nieuwsbriefsegmentatie in Convex;
- Keystatic artikelmetadata;
- publieke archieffilters;
- analytics.

Convex document-ID's zijn deploymentgebonden en horen daarom niet als canonieke waarden in Git-content. Displaynamen kunnen wijzigen en zijn ook geen stabiele ID.

## Canonieke identifiers

Gebruik stabiele lowercase ASCII keys:

```text
divisionKey: antwerpen-p1
teamKey: kfc-duffel
categoryKey: wedstrijdverslagen
authorKey: anton-verhasselt
```

Regels:

- eenmaal gebruikt niet hernoemen;
- labels mogen wijzigen;
- inactive items blijven voor historische content bestaan;
- geen provincie-/displaynaam als databasejoin;
- Git en Convex bewaren dezelfde key.

## Bronbestanden

```text
apps/web/content/settings/
├─ divisions.yaml
├─ teams.yaml
├─ categories.yaml
├─ authors.yaml
└─ editorial.yaml
```

### `divisions.yaml`

- `key`;
- `label`;
- `provinceKey`;
- `level`;
- `active`;
- `sortOrder`.

### `teams.yaml`

- `key`;
- `label`;
- `divisionKeys[]` of actuele `divisionKey`;
- `provinceKey`;
- `active`;
- optionele aliases.

### `categories.yaml`

Initiële keys:

- `wedstrijdverslagen`;
- `transfernieuws`;
- `interviews`;
- `analyse`;
- `jeugd`;
- `clubnieuws`.

Velden:

- key;
- label;
- description;
- active;
- sortOrder.

### `authors.yaml`

- key;
- displayName;
- role;
- bio?;
- image?;
- active.

### `editorial.yaml`

- sitenaam/tagline;
- standaard auteur;
- default gated status;
- eventuele redactionele contactcopy;
- geen secrets.

## Keystatic

Deze settings worden als collections/singletons beheerd waar nuttig. Artikelvelden bewaren keys, geen Convex IDs.

Keystatic UI:

- category/author als relationship of select uit settings;
- divisions/teams als multiselect met stable values;
- inactive waarden niet voor nieuwe selectie, wel historisch leesbaar;
- build valideert referentiële integriteit.

## Convex-projectie

Convex heeft `divisions` en `teams` met:

- `externalKey`;
- label/province/active;
- indexes `by_externalKey`.

Een gecontroleerde sync leest de Git-catalogus en maakt/updatet Convex-projecties.

Regels:

- dry-run verplicht;
- toont create/update/deactivate counts en samples;
- geen delete wanneer subscribers nog verwijzen;
- real run pas na expliciete bevestiging;
- idempotent;
- logt catalog version/hash.

Subscriberrecords mogen intern Convex IDs gebruiken. Publieke payloads en Keystatic gebruiken stable keys; mutations mappen keys server-side naar IDs.

## Publieke build

- signup UI embedt/buildt uit dezelfde Git-catalogus of publieke Convex metadataquery;
- archive filters lezen artikelkeys en settingslabels bij build;
- labels kunnen wijzigen zonder subscriberrelaties te breken;
- onbekende/inactive key geeft buildwarning of blocker volgens context.

## Analytics

Stuur keys:

- `division_key`;
- `team_key`;
- `category_key`;
- `author_key`.

Geen displaylabels als primaire breakdown.

## Artikelidentiteit

Voor MVP is `article_id` gelijk aan de canonieke slug.

- slug wordt vóór eerste publicatie gekozen;
- na eerste publicatie is slug immutable in normale Keystaticflow;
- een noodzakelijke wijziging vereist expliciete redirectmigratie en analyticsmapping;
- `article_id` en `slug` hebben daardoor dezelfde stabiele waarde.

Deze keuze vermijdt een verborgen custom UUID-field in Keystatic en houdt routes, analytics, sitemap en newslettercallbacks consistent.

## Acceptatiecriteria

- Eén key verwijst overal naar hetzelfde concept.
- Keystatic bewaart geen Convex document-ID.
- Convexmapping is indexed en server-side.
- Categorieën van publieke site komen uit `categories.yaml`.
- Bestaande subscribers blijven geldig wanneer labels wijzigen.
- Inactive teams/divisions verdwijnen niet uit historische data.
- Sync heeft dry-run en expliciete executeconfirm.
