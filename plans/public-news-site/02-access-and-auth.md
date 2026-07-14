# Toegang en authenticatie

## Doel

Lezers moeten onmiddellijk kunnen lezen en 90 dagen ingelogd blijven, zonder een magic link bij elk bezoek. Tegelijk mag alleen e-mailkennis nooit toegang geven tot persoonlijke subscriberdata.

## Objectieve keuze: Better Auth op Convex

Gebruik `@convex-dev/better-auth` met:

- Better Auth-sessies en gebruikersdata in de Convex-component;
- magic-linkplugin voor e-mailverificatie;
- anonymous-plugin voor onmiddellijke, laaggeprivilegieerde leestoegang;
- Resend voor welkomst- en magic-linkmails;
- een dunne same-origin Next.js auth handler onder `/api/auth/*`.

Dit is een goede fit:

| Eigenschap | Beoordeling |
|------------|-------------|
| Sessies in Convex | Ja; één backend en consistente authcontext in Convex-functies |
| Magic links | Ingebouwde plugin; geen eigen tokenprotocol nodig |
| Onmiddellijke toegang vóór verificatie | Better Auth anonymous session kan dit veilig modelleren |
| HttpOnly cookies | Better Auth gebruikt veilige cookies in productie |
| Revocation en meerdere apparaten | Ingebouwd |
| Typeveiligheid | Component integreert met Convex en TypeScript |

### Waarom er toch een Next.js route nodig is

“Alles in Convex” mag niet betekenen dat de browser zijn authcookie rechtstreeks vanaf een ander `*.convex.site`-domein krijgt. Safari/ITP en andere browserregels kunnen zo'n cookie als third-party behandelen.

Daarom:

```text
Browser
  └─ https://voetbalgazet.be/api/auth/*  (same-origin, dunne route)
       └─ Better Auth + Convex-component (sessies en logica)
```

De Next.js route bevat geen businesslogica of aparte database. Ze zorgt alleen dat Better Auth-responses, redirects en `Set-Cookie`-headers first-party via hetzelfde publieke domein lopen. Dit is noodzakelijk voor betrouwbare cookies en is geen reden om een tweede backend te bouwen.

## Twee toegangsniveaus

| Niveau | Hoe verkregen | Mag lezen | Mag voorkeuren zien/wijzigen | Bewezen e-mail |
|--------|---------------|-----------|--------------------------------|----------------|
| `reader` | Nieuwe inschrijving of invoer bestaand adres | Ja | Nee | Nee |
| `verifiedSubscriber` | Magic link / veilige nieuwsbrief-link | Ja | Ja | Ja |

Een Better Auth anonymous user/session draagt de `reader`-toegang. Na verificatie koppelt `onLinkAccount` de anonieme sessie aan de echte subscriberaccount.

## Waarom een bekend e-mailadres niet voldoende is

Een e-mailadres is meestal publiek of makkelijk te raden. Automatisch inloggen als de bestaande subscriber zou:

- accountovername mogelijk maken;
- voorkeuren en abonnementsstatus lekken;
- ongewenste wijzigingen door derden toelaten;
- subscriber-enumeratie en GDPR-risico creëren.

De gewenste frictieloze UX blijft behouden: een bestaand adres krijgt op een nieuw apparaat meteen een reader-session en kan het artikel lezen. Alleen identiteitsspecifieke functies wachten op linkverificatie.

## Flow 1 — nieuwe subscriber

1. Lezer opent gated artikel.
2. Gate toont publieke lead-in en formulier.
3. Lezer vult e-mail in.
4. Backend normaliseert en valideert het adres.
5. Als het adres nieuw is, UI toont voorkeuren.
6. Lezer kiest minstens één reeks en optioneel één club.
7. CTA **“Abonneer en lees verder”**:
   - maakt/updatet subscriber met `siteAccess = true`;
   - zet `newsletterSubscribed = true`;
   - schrijft consentversie, tijdstip, bron en formulierlocatie weg;
   - start een Better Auth anonymous session met `reader`-entitlement;
   - zet een 90-daagse HttpOnly cookie;
   - ontgrendelt onmiddellijk het artikel;
   - verstuurt welkomstmail met verificatie-/magic link.
8. Klik op de mail linkt de anonymous user aan de subscriberaccount en markeert `emailVerifiedAt`.

### Fout e-mailadres

- De reader-cookie blijft op dat apparaat geldig.
- Geen automatische bounce betekent geen geverifieerde identiteit.
- De subscriber blijft `emailVerifiedAt = null`.
- Geen identiteitsspecifieke voorkeurenroute.
- Bounces worden gemarkeerd zodat niet herhaald naar een onbereikbaar adres wordt gestuurd.

## Flow 2 — bestaand geverifieerd adres op nieuw apparaat

1. Lezer kiest “Al abonnee?” en vult e-mail in.
2. Backend geeft een reader-session en ontgrendelt onmiddellijk.
3. Bestaande voorkeuren, `newsletterSubscribed` en `siteAccess` worden niet gewijzigd. Een uitgeschreven subscriber wordt dus nooit stilzwijgend opnieuw ingeschreven.
4. Bestaande voorkeuren worden niet getoond.
5. Backend stuurt een magic link naar het adres.
6. Na klik wordt de sessie `verifiedSubscriber`.

### Enumerationbeperking

De succesboodschap is altijd generiek:

> Je kunt verder lezen. Als dit adres al bij ons bekend is, ontvang je ook een veilige link om dit apparaat te bevestigen.

API-respons, statuscode en foutcopy mogen niet bevestigen of een adres bestaat. Dat de voorkeurenstap bij een bekend adres wordt overgeslagen kan in de UI alsnog een zwak membershipsignaal geven. Dit is een bewuste MVP-trade-off om herhaald voorkeuren invullen te voorkomen; monitor misbruik en rate-limit per IP/adres.

## Flow 3 — bestaand apparaat

1. Browser stuurt HttpOnly sessiecookie automatisch.
2. Client vraagt Better Auth-sessionstatus.
3. `reader` of `verifiedSubscriber` verwijdert de gate.
4. Geen e-mailflow en geen voorkeurenstap.
5. Actief gebruik verlengt de sessie volgens `updateAge`.

## Flow 4 — nieuwsbriefartikel

1. Resend-link bevat opaque bootstrap-token en `returnTo`/articleslug.
2. Same-origin callback valideert:
   - handtekening;
   - vervaldatum;
   - subscriber bestaat;
   - `siteAccess = true`;
   - veilige allowlist voor `returnTo`.
3. Better Auth maakt/ververst een `verifiedSubscriber`-sessie.
4. Callback zet HttpOnly cookie.
5. HTTP 303 redirect naar canonieke artikel-URL zonder token.
6. Artikel opent volledig.

Tokenlevensduur: 30 dagen. Tokens bevatten geen leesbare PII, worden niet naar PostHog gestuurd en worden uit URL/logging verwijderd vóór analytics initialiseert.

## Flow 5 — nieuwsbrief uitschrijven

1. Unsubscribelink is een apart, doelgebonden token.
2. Klik zet alleen `newsletterSubscribed = false` en `unsubscribedAt`.
3. `siteAccess` en bestaande sessies blijven geldig.
4. Resubscribe vereist een nieuwe ondubbelzinnige CTA en consentregistratie.

## Flow 6 — voorkeuren wijzigen

- Link “Voorkeuren aanpassen” staat in nieuwsbrieffooter.
- Link bootstrapt eerst een geverifieerde sessie en opent `/voorkeuren`.
- Pagina toont huidige reeksen en maximaal één club.
- Minstens één reeks moet na opslaan overblijven.
- Reader-only sessies krijgen geen data en worden naar een magic-linkflow in dezelfde sheet geleid.

## Sessiespecificatie

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 90,
  updateAge: 60 * 60 * 24 * 7,
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,
    strategy: "compact",
  },
},
advanced: {
  useSecureCookies: true,
  defaultCookieAttributes: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  },
},
plugins: [
  anonymous({ onLinkAccount: migrateReaderSession }),
  magicLink({
    expiresIn: 60 * 15,
    storeToken: "hashed",
    sendMagicLink: sendWithResend,
  }),
],
```

Definitieve API en componentconfiguratie verifiëren tijdens implementatie tegen de dan actuele packageversies.

## Datamodelconcept

### `subscribers`

| Veld | Type | Betekenis |
|------|------|-----------|
| `normalizedEmail` | string | Lowercase/normalised; uniek indexveld |
| `emailVerifiedAt` | number? | Bewijs dat mailboxlink ooit is gebruikt |
| `siteAccess` | boolean | Mag gated artikels lezen |
| `siteAccessGrantedAt` | number | Start toegang |
| `newsletterSubscribed` | boolean | Los van siteAccess |
| `newsletterSubscribedAt` | number? | Laatste inschrijving |
| `unsubscribedAt` | number? | Laatste uitschrijving |
| `consentVersion` | string | Exacte copyversie |
| `consentCapturedAt` | number | Tijdstip bevestigende CTA |
| `consentSource` | union | `article_gate` / `homepage_inline` |
| `divisionIds` | Id[] | Minstens één |
| `favoriteTeamId` | Id? | Maximaal één |
| `resendContactId` | string? | Externe koppeling |
| `emailDeliveryStatus` | union | `unknown` / `deliverable` / `bounced` |

Voorkeuren kunnen voor normalisatie later als relationele tabellen worden opgeslagen; arrays zijn aanvaardbaar zolang het aantal reeksen klein en begrensd blijft.

### Accesscontrole

- Publieke metadataquery: geen auth nodig.
- Gate/sessionstatus: Better Auth-context.
- `reader`: alleen boolean entitlement, nooit subscriberdocument.
- `verifiedSubscriber`: gekoppelde `subscriberId`, ownershipcheck op voorkeuren.
- Adminfuncties: aparte rol en wrapper; publieke subscriber kan nooit adminroutes aanroepen.

## Abuse- en veiligheidsmaatregelen

- Rate limiting op signup, magic-link en tokenexchange.
- Generieke antwoorden om e-mailenumeratie te beperken.
- Magic tokens hashed en single-purpose.
- Newsletter bootstrap-token nooit als sessietoken gebruiken; altijd exchange + redirect.
- Alleen relatieve/allowlisted callbacks om open redirects te voorkomen.
- CSRF- en originchecks van Better Auth actief houden.
- Geen tokens, e-mail of subscriber-ID in localStorage, URL analytics of clientlogs.
- Content Security Policy, beperkte third-party scripts en output escaping.
- Server-side sessierevocation bij supportverwijdering of misbruik.

## Implementatievolgorde

1. Convex Better Auth-component + same-origin handler.
2. Anonymous en magic-link plugins.
3. Subscriberstatussen en identity-linking.
4. Gate signup en reader-session.
5. Welkomst-/verificationmail.
6. Newsletter bootstrap exchange.
7. Preferenceslink en geverifieerde ownershipchecks.
8. Rate limiting, bouncehandling en securitytests.
