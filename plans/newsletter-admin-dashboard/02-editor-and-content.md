# Editor en contentarchitectuur

## Keuze: open-source React Email editor

Gebruik [`@react-email/editor`](https://react.email/docs/editor/getting-started), de open-source visual editor uit React Email 6.

De editor:

- draait als clientcomponent in de Next.js-admin;
- gebruikt TipTap/ProseMirror als documentmodel;
- ondersteunt tekstblokken, links, afbeeldingen, kolommen, knoppen, dividers en email-safe styling;
- kan met eigen `EmailNode`-extensies redactionele blokken aanbieden;
- exporteert email-ready HTML en plaintext;
- is geen vrije pixelcanvas en moet ook niet als dusdanig worden gepresenteerd.

Definitieve API's, exports en extensiepunten moeten tijdens implementatie tegen de dan geïnstalleerde packageversie worden gecontroleerd. Het plan veronderstelt niet dat een blogvoorbeeld exact ongewijzigd compileert.

## Belangrijke scheiding: shell en body

Een nieuwsbrief bestaat uit:

```text
NewsletterEnvelope (code-based, vergrendeld)
├─ hidden preheader
├─ brand header / masthead
├─ editor body (visueel bewerkbaar)
├─ preference link (persoonlijk)
├─ unsubscribe link (persoonlijk)
├─ privacy/contact/legal footer
└─ tracking- en accessibilitymetadata
```

Alleen de **editor body** is vrij bewerkbaar.

De vaste shell voorkomt dat een redacteur per ongeluk:

- de uitschrijflink verwijdert;
- verplichte bedrijfsgegevens wist;
- de masthead inconsistent maakt;
- email-clientkritische HTML breekt;
- persoonlijke tokens als gewone tekst opslaat.

Desktop- en mobiele preview tonen altijd de samengestelde shell, niet alleen de body.

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
3. render body, shell en plaintext met de gedeelde renderer;
4. bewaar renderer- en templateversie;
5. koppel die revisie aan de send.

Latere editor- of CSS-updates mogen een verzonden nieuwsbrief niet retrospectief veranderen.

## Gedeelde renderer

Gebruik één gedeeld pakket/module voor:

- editor-extensieregistratie;
- thematokens;
- documentvalidatie;
- `composeReactEmail`;
- React Email-shell;
- HTML- en plaintextrendering;
- linktransformatie;
- footer en headers.

De browser gebruikt deze code voor preview. Een Convex Node action gebruikt dezelfde versies server-side voor test- en liveverzending.

De server vertrouwt geen door de browser aangeleverde finale HTML. Adminauth beschermt tegen onbevoegde gebruikers, maar server-side rendering voorkomt ook versieverschillen, ongewenste tags en gemanipuleerde requests.

## Thema

Vertaal de Open Design-brand naar email-safe tokens:

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

### Eigen redactionele blokken

#### Artikelkaart

De redacteur kiest een gepubliceerd artikel uit Convex. Het node-document bewaart alleen stabiele referenties en expliciete overrides:

```typescript
type ArticleBlockAttributes = {
  articleId: Id<"articles">;
  revisionId: Id<"articleRevisions">;
  showImage: boolean;
  showDek: boolean;
  ctaLabel: string;
  headlineOverride?: string;
  dekOverride?: string;
};
```

Bij toevoegen wordt een concrete gepubliceerde artikelrevisie gekozen. Daardoor verandert de nieuwsbriefpreview niet stilzwijgend wanneer het live artikel later wordt aangepast. De link blijft wel naar de canonieke artikel-URL gaan.

Render:

- kicker/reeks;
- headline;
- optioneel hoofdbeeld;
- dek;
- auteur en datum indien gewenst;
- `Lees verder →`;
- purpose-bound subscriberlink pas tijdens recipient rendering.

#### Redactienoot

- optionele korte intro;
- semantisch herkenbaar voor styling;
- geen vrije scripts of embeds.

#### Uitgelichte quote

- quote + optionele bron;
- email-safe typografie;
- niet gebruiken voor persoonlijke of onbevestigde uitspraken zonder redactionele controle.

### Later

- wedstrijdkaart;
- standings snippet;
- sponsorblok;
- social links;
- gepersonaliseerd “Jouw club”-blok;
- AI-suggesties.

## Afbeeldingen

### Upload

`onUploadImage`:

1. valideert MIME type en bestandsgrootte;
2. vraagt een gecontroleerde R2-upload URL;
3. bewaart mediarecord in Convex;
4. levert een publieke CDN-URL aan de editor;
5. vereist alttekst vóór finale send.

Aanbevolen limieten:

- JPEG, PNG, WebP en eventueel GIF na expliciete productkeuze;
- maximaal 5 MB bronbestand;
- server-side varianten voor 1200 px en e-mailbreedte;
- geen SVG uit onbeheerde bron;
- geen data-URI's.

### Externe beelden

Plakken van willekeurige externe image-URL's is standaard uit. De gebruiker importeert het beeld eerst naar R2. Dit voorkomt tracking door derde partijen, kapotte hotlinks en onbetrouwbare content.

## Links

De editor laat alleen `https:`, `mailto:` en gecontroleerde interne paden toe.

Bij render:

- interne artikellinks worden per ontvanger vervangen door veilige newsletter-bootstraplinks;
- de canonieke bestemming blijft als metadata beschikbaar;
- externe links krijgen campagne-UTM's wanneer de redacteur dit niet uitschakelt;
- `javascript:`, `data:` en onbekende schema's worden geweigerd;
- tokens, e-mailadressen en subscriber-ID's staan nooit leesbaar in de editorbron.

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
- dezelfde shell;
- dezelfde headers;
- dezelfde linktransformatie, maar met expliciete testtokens;
- prefix `[TEST]` in onderwerp;
- een duidelijke testbanner bovenaan.

Testadressen worden niet automatisch subscriber en beïnvloeden geen campagnestatistieken.

## Validatie vóór test of send

Blokkerend:

- leeg onderwerp;
- lege body;
- ontbrekende afzender;
- ongeldige of ontbrekende uitschrijfmogelijkheid in de shell;
- onbekend editorformat;
- ongeldige linkschema's;
- body groter dan limiet;
- ontbrekende gepubliceerde artikelrevisie;
- geen geldig publiek.

Waarschuwing, overridable:

- onderwerp langer dan circa 60 tekens;
- preheader langer dan circa 100 tekens;
- ontbrekende alttekst op decoratief niet-gemarkeerd beeld;
- linktekst zoals “klik hier”;
- grote HTML-output;
- geen testmail sinds laatste wijziging;
- campagne bevat geen artikelblok.

Voor live send is “geen testmail sinds laatste wijziging” volgens de productdefault **blokkerend**. Admin kan dit alleen omzeilen via een expliciet gelogde noodoverride als die mogelijkheid later gewenst blijkt.

## Toegankelijkheid van de mail

- semantische headings in logische volgorde;
- betekenisvolle alttekst;
- voldoende contrast;
- knoppen minstens ongeveer 44 px hoog op mobiel;
- links niet alleen door kleur onderscheiden;
- leesbare plaintextvariant;
- `lang="nl"` op document;
- geen kritieke informatie uitsluitend in afbeeldingen;
- tabelmarkup alleen voor e-maillayout, met passende presentation attributes waar nodig.
