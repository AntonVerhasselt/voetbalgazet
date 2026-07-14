# Editor en contentarchitectuur

## Keuze: open-source React Email editor

Gebruik [`@react-email/editor`](https://react.email/docs/editor/getting-started), de open-source visual editor uit React Email 6.

De editor:

- draait als clientcomponent in de Next.js-admin;
- gebruikt TipTap/ProseMirror als documentmodel;
- ondersteunt tekstblokken, links, afbeeldingen, kolommen, knoppen, dividers en email-safe styling;
- gebruikt in MVP standaard editorblokken plus een beperkt typed systeemvariabelen-node voor transactionele e-mails;
- exporteert email-ready HTML en plaintext;
- is geen vrije pixelcanvas en moet ook niet als dusdanig worden gepresenteerd.

Definitieve API's, exports en extensiepunten moeten tijdens implementatie tegen de dan geïnstalleerde packageversie worden gecontroleerd. Het plan veronderstelt niet dat een blogvoorbeeld exact ongewijzigd compileert.

## Vrije editor; vaste footer alleen voor campagnes

Een nieuwsbrief bestaat uit:

```text
editor output (volledig visueel en vrij opgebouwd)
└─ locked compliance footer
   ├─ unsubscribe link (persoonlijk)
   ├─ voorkeuren aanpassen (persoonlijke verified-session bootstrap)
   ├─ verplichte juridische/contactgegevens
   └─ technische tracking/accessibilitymetadata
```

Er is geen vaste brandheader, masthead, contenttemplate, artikelstructuur of styling boven de footer. De redacteur bouwt iedere e-mail volledig zelf met de editor of vertrekt van een duplicaat.

De footer is niet selecteerbaar of bewerkbaar in het editor-document. Ze wordt pas in preview en serverrendering toegevoegd. Dit garandeert unsubscribe, voorkeurenbeheer en wettelijk vereiste informatie zonder de custom inhoud te beperken.

Transactionele e-mails gebruiken dezelfde vrije editor. Hun type kan daarnaast verplichte systeemvariabelen eisen, bijvoorbeeld een magic-linkknop. De redacteur bepaalt tekst, volgorde en visuele opbouw; de server blokkeert publicatie wanneer een vereiste systeemvariabele ontbreekt of semantisch werd gewijzigd.

Transactionele e-mails krijgen geen nieuwsbrief-unsubscribefooter. Alleen hun typed functionele vereisten worden buiten de vrije inhoud afgedwongen.

## Bronformaten

### Bewerkbare bron

Bewaar het TipTap-document als een geserialiseerde JSON-string:

```typescript
type StoredEditorDocument = {
  format: "react-email-editor";
  formatVersion: 1;
  documentJson: string;
};
```

Waarom een string in plaats van `v.any()`:

- de Convex-validator blijft expliciet;
- package-interne nodevormen lekken niet door het hele datamodel;
- migraties kunnen op `formatVersion` gestuurd worden;
- het document kan vóór gebruik geparsed en tegen een eigen allowlist gevalideerd worden.

Stel een maximale bodygrootte in, aanbevolen **256 KiB** voor de JSON-string. Afbeeldingen horen in R2 en nooit als base64 in het document.

### Afgeleide preview

Bewaar optioneel op het concept:

- `previewHtml`: laatst succesvol samengestelde preview;
- `previewText`: laatst afgeleide plaintext;
- `previewGeneratedAt`;
- `previewRendererVersion`.

Dit is cache, niet de bron van waarheid. Een send gebruikt nooit blind oude client-HTML.

### Definitieve send snapshot

Bij plannen of verzenden:

1. valideer het editor-document;
2. maak een immutable `newsletterRevisions`-record;
3. render editoroutput, voor campagnes de minimale vaste footer, en plaintext met de gedeelde renderer;
4. bewaar renderer-, editor-schema- en footerversie;
5. koppel die revisie aan de send.

Latere editor- of CSS-updates mogen een verzonden nieuwsbrief niet retrospectief veranderen.

## Gedeelde renderer

Gebruik één gedeeld pakket/module voor:

- editor-extensieregistratie;
- thematokens;
- documentvalidatie;
- `composeReactEmail`;
- conditionele compliancefooter voor nieuwsbriefcampagnes;
- HTML- en plaintextrendering;
- linktransformatie;
- footer, systeemvariabelen en headers.

De browser gebruikt deze code voor preview. Een Convex Node action gebruikt dezelfde versies server-side voor test- en liveverzending.

De server vertrouwt geen door de browser aangeleverde finale HTML. Adminauth beschermt tegen onbevoegde gebruikers, maar server-side rendering voorkomt ook versieverschillen, ongewenste tags en gemanipuleerde requests.

## Thema

De editor mag neutrale De Voetbalgazet-defaults aanbieden, maar legt geen vaste template of huisstijlstructuur op:

| Token | Aanbevolen toepassing |
|-------|------------------------|
| Paper background | `#F5F0E8`-achtige solide fallback |
| Ink | Bijna zwart voor tekst en regels |
| Muted | Grijs/bruin voor metadata |
| Border | 1px hairline rules |
| Display font | Georgia/Times fallback; webfonts zijn niet betrouwbaar |
| Body font | Systeem-sans of Georgia volgens bloktype |
| Max width | 600–640 px |
| Radius | Geen of minimaal; volgt krantentaal |

Gebruik inline styles en door React Email ondersteunde patronen. Geen paper grain, CSS variables, complexe positionering, JavaScript of externe stylesheets in de uiteindelijke mail.

## Blokken in MVP

### Standaard editorblokken

- heading niveau 1–3;
- paragraph;
- bold, italic, underline;
- ordered/unordered list;
- link;
- button;
- image;
- divider;
- spacer;
- quote;
- twee kolommen, alleen wanneer mobile stacking betrouwbaar is.

### Geen domeinspecifieke contentblokken in MVP

Er is geen Artikelkaart, article picker, redactienoottemplate, vast aantal artikels of automatische koppeling met gepubliceerde content. De redacteur maakt tekst, links, knoppen, beelden en opbouw volledig handmatig met de standaard editorblokken.

Dupliceren van een bestaande e-mail is de enige hergebruikflow in het MVP.

## Afbeeldingen

### Onderzochte React Email + Convex R2-flow

React Email ondersteunt dit rechtstreeks via:

```tsx
<EmailEditor
  onUploadImage={async (file) => {
    const key = await uploadFile(file);
    return { url: getPermanentCdnUrl(key) };
  }}
/>
```

Wanneer `onUploadImage` bestaat, ondersteunt de editor dezelfde uploadflow voor:

- paste vanuit clipboard;
- drag-and-drop;
- file picker/slash command.

Tijdens upload toont de editor tijdelijk een blob-URL. Na succes vervangt hij die door de teruggegeven permanente URL; bij failure wordt het tijdelijke imagenode verwijderd.

Koppeling met `@convex-dev/r2`:

1. installeer de R2-component als sibling van Resend;
2. maak in `convex/emailMedia.ts` een typed `R2(components.r2)` client met `clientApi<DataModel>`;
3. exporteer uit dat modulecontract `generateUploadUrl`, `syncMetadata` en `onSyncMetadata`, zodat `useUploadFile(api.emailMedia)` exact de functies krijgt die de hook verwacht;
4. `checkUpload` vereist Admin/Journalist en weigert onbevoegde uploads;
5. de editorcallback gebruikt `useUploadFile(api.emailMedia)`;
6. `useUploadFile(file)` maakt een signed upload URL, uploadt rechtstreeks naar R2, synchroniseert metadata en retourneert de object key;
7. `onSyncMetadata` haalt na upload `ContentType` en `ContentLength` op via `r2.getMetadata`, valideert die en koppelt key/uploader/tijdstip aan een `emailMedia`-record;
8. pas na geldige metadata krijgt het record `ready` en retourneert de editorflow een permanente CDN-URL.

`r2.getUrl(key)` is ongeschikt voor verzonden e-mailbeelden: die signed URL verloopt standaard na 15 minuten en omzeilt Cloudflare edge cache. Het bevestigde publieke R2/CDN-subdomein is `media.devoetbalgazet.be`; bouw de permanente URL veilig uit de server-generated object key.

Gebruik niet de rate-limited `r2.dev` URL in productie.

### Validatie en lifecycle

- clientvalidatie geeft snelle UX-feedback, maar is niet de veiligheidsgrens;
- metadata wordt na upload server-side gevalideerd;
- JPEG, PNG, WebP en GIF zijn toegestaan;
- maximaal 5 MB bronbestand;
- animated GIF is toegestaan maar krijgt een size/clientwaarschuwing omdat sommige clients alleen het eerste frame tonen;
- geen onbeheerde SVG of data-URI;
- de standaard `useUploadFile`-flow laat de component een UUID object key maken; alleen wanneer later een pad zoals `email-media/{uuid}` nodig is, komt er een eigen authenticated `generateUploadUrl` mutation omdat de standaard client API geen clientgekozen custom key aanvaardt;
- bucket-CORS laat alleen bekende admin origins en noodzakelijke `PUT`/`GET` toe;
- e-mailbeelden zijn publiek omdat inboxclients ze zonder login moeten laden;
- alttekst is verplicht vóór live send;
- een asset die in een verzonden revisie voorkomt wordt niet verwijderd, anders breken oude mails;
- ongebruikte draftassets kunnen na retentiecontrole worden opgeruimd.

### Externe beelden

De editor laat gebruikers beelden invoegen via de ingebouwde uploadinteracties; die flow uploadt altijd naar R2. Een geplakte imagefile werkt dus rechtstreeks. Willekeurige externe image-URL's worden niet als duurzame bron opgeslagen: importeer ze eerst naar R2 om hotlinkrot en externe tracking te voorkomen.

## Links

De editor laat alleen `https:`, `mailto:` en gecontroleerde interne paden toe.

Bij render:

- alle contentlinks zijn handmatig door de redacteur toegevoegd;
- externe links krijgen campagne-UTM's wanneer de redacteur dit niet uitschakelt;
- `javascript:`, `data:` en onbekende schema's worden geweigerd;
- tokens, e-mailadressen en subscriber-ID's staan nooit leesbaar in de editorbron.

Transactionele editorversies gebruiken typed systeemvariabelen voor magic/verificationlinks. De editor kan zo'n systeemlink positioneren en stylen, maar niet vervangen door een willekeurig token of een client-aangeleverde geheime URL.

## Autosave en samenwerking

### Eerste versie

Optimistische lock via:

- `updatedAt`;
- `revisionNumber`;
- `lastEditedBy`.

Elke update bevat de verwachte `revisionNumber`. Bij conflict:

- server weigert met `EDITOR_CONFLICT`;
- UI toont wie intussen opsloeg;
- gebruiker kan eigen document kopiëren, nieuwste laden of als nieuw concept bewaren.

Dit is voldoende voor een kleine redactie en voorkomt silent last-write-wins.

### Later

Realtime collaborative editing via Yjs/ProseMirror is buiten scope totdat meerdere redacteurs aantoonbaar gelijktijdig hetzelfde concept bewerken.

## Preview

### Browserpreview

Tabs:

- desktop 600–640 px;
- mobiel 320–375 px;
- plaintext;
- donkere-modussimulatie als waarschuwing, niet als garantie.

Toon ook:

- onderwerp;
- preheader;
- afzender;
- reply-to;
- waarschuwing voor ontbrekende alttekst;
- waarschuwing voor te lange onderwerpregel/preheader;
- linklijst met bestemmingen;
- geschatte HTML-grootte.

### Testmail

Een testmail gebruikt exact:

- dezelfde immutable revisie;
- dezelfde serverrenderer;
- bij nieuwsbriefcampagnes dezelfde minimale compliancefooter; bij transactionele tests geen marketingfooter;
- dezelfde headers;
- dezelfde linktransformatie, maar met expliciete testtokens;
- prefix `[TEST]` in onderwerp;
- een duidelijke testbanner bovenaan.

Testadressen worden niet automatisch subscriber en beïnvloeden geen campagnestatistieken.

## Validatie vóór test of send

Blokkerend:

- leeg onderwerp;
- lege preheader;
- lege body;
- ontbrekende afzender;
- ongeldige of ontbrekende uitschrijfmogelijkheid in de vaste footer;
- ongeldige of ontbrekende `Voorkeuren aanpassen`-link in de vaste footer;
- onbekend editorformat;
- ongeldige linkschema's;
- body groter dan limiet;
- ontbrekende alttekst op een niet-decoratief beeld;
- ontbrekende vereiste systeemvariabele bij transactionele e-mail;
- geen succesvolle testmail op de huidige inhoud/sender/linkrevision;
- geen geldig publiek.

Waarschuwing, overridable:

- onderwerp langer dan circa 60 tekens;
- preheader langer dan circa 100 tekens;
- linktekst zoals “klik hier”;
- grote HTML-output;

Een Admin-noodoverride voor de testvereiste wordt niet in het MVP voorzien.

## Toegankelijkheid van de mail

### Mobile-first rendering

Mobile-first e-mailregels uit [`../ui-ux/`](../ui-ux/):

- ontwerp en test eerst op 320–375 px;
- één kolom als default;
- body minimaal 16 px;
- 16–20 px horizontale padding;
- buttons/links circa 44 px hoog;
- beelden responsief en block-level;
- geen hoverafhankelijke informatie;
- kolommen alleen wanneer mobile stacking in echte clients getest is;
- desktop max-width 600–640 px;
- HTML-grootte bewaken tegen Gmail clipping rond 102 KB;
- vaste unsubscribe/preferencesfooter blijft leesbaar en tapbaar;
- dark mode, plaintext en image-blocking testen.

### Accessibility

- semantische headings in logische volgorde;
- betekenisvolle alttekst;
- voldoende contrast;
- knoppen minstens ongeveer 44 px hoog op mobiel;
- links niet alleen door kleur onderscheiden;
- leesbare plaintextvariant;
- `lang="nl"` op document;
- geen kritieke informatie uitsluitend in afbeeldingen;
- tabelmarkup alleen voor e-maillayout, met passende presentation attributes waar nodig.
