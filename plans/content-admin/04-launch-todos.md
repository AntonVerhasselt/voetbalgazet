# Launch-todo's artikeladmin

## Keystatic

- [ ] `@keystatic/core`, `@keystatic/next`, `@markdoc/markdoc` versies controleren
- [ ] `apps/web/keystatic.config.ts` definiëren
- [ ] Local mode voor development
- [ ] GitHub mode voor hosted admin
- [ ] GitHub App maken en tot repository beperken
- [x] Keystatic secrets in Vercel instellen
- [ ] `/keystatic` UI en `/api/keystatic/*` route
- [ ] Better Auth Admin/Journalist-gate vóór `/keystatic` UI
- [ ] Viewer krijgt 403/redirect voor `/keystatic` en `/preview/*`
- [ ] Keystatic OAuthcallback blijft werken met route/middlewareconfig
- [ ] De Voetbalgazet brand/name/navigation instellen
- [ ] GitHub write access per Admin/Journalist controleren
- [ ] Viewer zonder write access testen

## Contentmodel

- [ ] `articles` collection
- [ ] auteurs/categories/editorial settings
- [ ] Markdoc componenten
- [ ] status draft/published/archived
- [ ] gated/vrij
- [ ] provincie/reeks/clubmetadata
- [ ] hero/social images, alt en credit
- [ ] SEO-fields
- [ ] slug/redirectbeleid
- [ ] buildvalidators

## Preview en publicatie

- [ ] `previewUrl` configureren
- [ ] Next.js draft mode start/end
- [ ] branch/return URL allowlist
- [ ] Kortlevende signed previewrequest + CSRF/origincheck
- [ ] noindex/no-cache preview
- [ ] gated/ungated preview
- [ ] mobile 360/390 preview
- [ ] Git commit → Vercel build
- [ ] buildfailure houdt oude production live
- [ ] rollback via Git revert testen

## Images

- [ ] Keystatic image field naar `apps/web/public/images/articles`
- [ ] Markdoc image directory/publicPath
- [ ] alttekst verplicht
- [ ] creditflow
- [ ] bestandstype en groottelimiet
- [ ] responsive width/height
- [ ] repositorygroei meten

## Mobile en toegankelijkheid

- [ ] Adminlanding 320/375/390/768 px
- [ ] Keystatic list/edit op 320/375 px
- [ ] Virtual keyboard en sticky controls
- [ ] 44 px tap targets
- [ ] 200% zoom
- [ ] keyboard/screen reader smoke
- [ ] status niet alleen kleur
- [ ] publishconfirm mobiel

## Contentpilot

- [ ] Minstens drie echte artikelen als fixtures
- [ ] Lang headline/dek
- [ ] Meerdere inlinebeelden
- [ ] Gated en vrij artikel
- [ ] Draft, publish, update en archive
- [ ] Sitemap/RSS/searchindex controleren
- [ ] Mobile Core Web Vitals controleren
