# Admin-UX en workflows

## Designrichting

Gebruik de publieke De Voetbalgazet-vormtaal:

- warm papierwit;
- ink-black typography;
- Playfair/serif voor titels;
- systeem-sans voor formulieren;
- monospace voor status, timestamps en aantallen;
- hairline rules;
- geen generieke SaaS-card-overload;
- scherpe randen en duidelijke hiërarchie.

De emailcanvas zelf staat op neutraal grijs/wit zodat de mail los van het adminchroom beoordeeld kan worden.

De lokale Open Design-map is niet beschikbaar op cloudagents. Voor implementatie moeten `brand-spec.md`, `styles.css`, logo en assets eerst naar een gedeeld repositorypad.

## Globale adminnavigatie

```text
Redactie
├─ Verhalen
├─ Artikels
├─ Nieuwsbrieven
│  ├─ Concepten
│  ├─ Gepland
│  ├─ Verzonden
│  └─ Dienstmails
├─ Abonnees
└─ Instellingen (Admin)
```

Nieuwsbrieven is geen losse externe tool; ze staat in dezelfde adminshell als artikelpublicatie.

## Scherm 1 — overzicht

Route: `/admin/nieuwsbrieven`

### Tabs

- Concepten;
- Gepland;
- Verzonden;
- Alles.

### Rijgegevens

- interne naam;
- onderwerp;
- status;
- laatste editor;
- laatst gewijzigd;
- planning of senddatum;
- audiencebeschrijving;
- recipient count indien bekend;
- delivery health na send.

### Acties

| Status | Primaire actie | Secundaire acties |
|--------|----------------|-------------------|
| draft | Bewerken | Dupliceren, verwijderen |
| scheduled | Bekijken | Tijdstip wijzigen, nu verzenden, planning annuleren, dupliceren |
| preparing/sending | Resultaten volgen | Dupliceren |
| sent/partially_failed/failed | Resultaten | Dupliceren |
| cancelled | Bekijken | Dupliceren |

Verwijderen is alleen voor een nooit verzonden draft. Sent/auditdata wordt niet uit gewone UI verwijderd.

### Filters

- status;
- auteur/editor;
- datum;
- zoek op interne naam of onderwerp;
- reeks/club uit audience definition;
- delivery health.

Gebruik server-side gepagineerde query. Zoekresultaten tonen nooit recipient e-mailinhoud.

## Scherm 2 — editor

Route: `/admin/nieuwsbrieven/[campaignId]`

### Header

- breadcrumb;
- editable interne naam;
- status;
- autosavestatus;
- laatste editor;
- knop Preview;
- knop Controleren en versturen.

### Layout desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ campaign header / save / preview / control                   │
├────────────────┬───────────────────────────────┬─────────────┤
│ blocks/assets  │ email canvas                  │ inspector   │
│ image upload   │                               │ properties  │
└────────────────┴───────────────────────────────┴─────────────┘
```

Op kleiner scherm worden zijpanelen drawers/tabs. De editor hoeft niet volwaardig bruikbaar te zijn op telefoon; tablet/desktop is primair, maar niets mag onbereikbaar zijn.

### Campagne-instellingen

- interne naam;
- onderwerp;
- preheader;
- sender profile;
- reply-to;
- campagne-UTM;

Onderwerp en preheader staan zichtbaar boven de canvas, omdat inboxpresentatie deel van de redactionele inhoud is.

### Vrije inhoud

- geen artikelpicker of koppeling met artikelrecords;
- geen vast aantal contentitems;
- geen standaard template;
- redacteur gebruikt tekst, links, knoppen, beelden, dividers en layoutblokken rechtstreeks;
- eerder ontwerp hergebruiken gebeurt via dupliceren.

### Beelden in de editor

- drag-and-drop, paste en de React Email image command gebruiken dezelfde R2-uploadcallback;
- tijdelijke uploadprogress verschijnt direct in de canvas;
- na upload gebruikt de node de permanente `media.devoetbalgazet.be` CDN-URL;
- image inspector laat alttekst, afmetingen, alignment en optionele link aanpassen;
- uploadfailure verwijdert de tijdelijke node en toont een concrete retry;
- mediapicker mag eerder geüploade e-mailbeelden tonen, maar is geen vereiste voor de eerste editorrelease.

## Scherm 3 — preview

Drawer of route binnen editor.

Tabs:

- Inbox;
- Desktop;
- Mobiel;
- Plaintext;
- Links.

### Inboxpreview

Toont:

- afzendernaam;
- afzenderadres;
- onderwerp;
- preheader;
- relatieve tijdsimulatie.

### Linkcheck

Lijst:

- zichtbare linktekst;
- canonieke bestemming;
- type intern/extern/preferences/unsubscribe;
- validatiestatus;
- waarschuwing bij dubbele of kapotte URL.

Geen echte productietokens genereren in browserpreview.

## Scherm 4 — publiek

Route: `/admin/nieuwsbrieven/[campaignId]/publiek`

### Selectie

- vaste banner: “Uitgeschreven, gebouncete en klagende adressen worden altijd uitgesloten”;
- standaardselectie “Alle actieve abonnees”, die de redacteur expliciet bevestigt;
- reekschips gegroepeerd per provincie;
- zoekbare clubpicker;
- leesbare filterzin;
- live bereik.

### Resultatenpaneel

- actieve basislijst;
- na voorkeurfilter;
- uitgesloten per reden;
- percentage;
- berekend op;
- gemaskeerde sample;
- refreshknop.

Audiencewijziging maakt vorige teststatus niet noodzakelijk ongeldig, omdat content niet wijzigt. Sender- of contentwijziging doet dat wel.

## Scherm 5 — controleren en versturen

Route: `/admin/nieuwsbrieven/[campaignId]/controleren`

### Checklist

| Controle | Gedrag |
|----------|--------|
| Onderwerp aanwezig | Blocker |
| Preheader aanwezig | Blocker |
| Body valide | Blocker |
| Alle links veilig | Blocker |
| Altteksten | Blocker voor niet-decoratieve beelden |
| Sender domain verified | Blocker |
| Publiek niet leeg | Blocker |
| Audience preview actueel | Blocker/refresh |
| Testmail op huidige revisie succesvol | Blocker |
| Footerconfig volledig | Blocker |
| HTML-grootte veilig | Waarschuwing of blocker boven harde limiet |

### Testmail

- één of meer expliciete adressen;
- suggesties uit beperkte interne allowlist;
- status per test;
- timestamp en revision;
- “Open in provider” alleen voor Admin als diagnostische link veilig kan.

### Sendkeuze

- Nu verzenden;
- Plannen;
- terug naar editor.

### Finale modal

Vermeld groot:

- onderwerp;
- audiencebeschrijving;
- actuele preview count; bij scheduling met duidelijke melding dat de finale count op sendmoment kan wijzigen;
- sendmoment/tijdzone;
- afzender;
- “Na bevestiging kan de inhoud niet meer worden gewijzigd.”

Aanbevolen confirm:

```text
Typ VERSTUREN om deze verzending voor het getoonde publiek te bevestigen.
```

Voor kleine test-/interne audiences kan een gewone checkbox volstaan, maar één consistent patroon is eenvoudiger en veiliger.

## Scherm 6 — resultaten

Route: `/admin/nieuwsbrieven/[campaignId]/resultaten`

### Tijdens send

- preparing progress;
- recipient count;
- queued;
- provider sent;
- delivery delayed;
- failed;
- laatste update;
- duidelijke melding dat venster sluiten send niet stopt.

### Na send

- selected;
- suppressed at final check;
- queued/sent;
- delivered;
- bounced;
- complained;
- failed;
- opens/clicks, waarbij opens expliciet als indicatief worden gelabeld;
- top article links;
- unsubscribes;
- deliverytrend in tijd.

### Recipientdetails

Gepagineerde tabel met:

- gemaskeerd adres standaard;
- status;
- laatste event;
- veilige errorcode;
- reeks/clubmatch;
- resend recovery eligibility.

Volledig adres pas na expliciete reveal met reden/audit, of alleen voor Admin. Geen bulkexport in MVP.

## Scherm 7 — dienstmails

Route: `/admin/email/dienstmails`

Overzicht:

- transactioneel type;
- draft- en actieve versie;
- laatste editor/publiceerder;
- status;
- verzendtijd;
- gemaskeerde ontvanger;
- providerstatus;
- errorcode;
- correlatie naar signup/authflow.

Acties:

- visueel bewerken;
- typed systeemvariabelen invoegen via de editor;
- preview met veilige dummydata;
- verplichte testmail;
- nieuwe versie publiceren;
- eerdere versie als nieuwe actieve versie herstellen;
- retry alleen wanneer de triggerflow dat veilig toestaat;
- geen live magic token tonen.

## Scherm 8 — abonnees

Route: `/admin/abonnees`

MVP is operationeel en voorzichtig, geen volwaardig CRM:

- gepagineerde lijst;
- zoek op exact/genormaliseerd adres, alleen Admin/Journalist;
- adres standaard gemaskeerd voor Viewer;
- newsletterstatus, siteAccess, verificatie en deliverystatus;
- gekozen reeksen en favoriete club;
- actieve suppressions;
- consentbron/versie/timestamp;
- recente campagnestatussen zonder volledige body.

Acties:

- voorkeuren niet namens subscriber aanpassen in normale flow;
- manual suppression alleen Admin met reden;
- unsuppress volgens complaint/bounce/resubscribe-regels;
- link naar supportprocedure voor export/delete;
- geen bulkexport in MVP.

De pagina bevestigt nooit via een publieke API of een e-mailadres bestaat; dit is uitsluitend protected adminfunctionaliteit met audit.

## Instellingen

Alleen Admin:

- sender profiles;
- verified domeinstatus;
- reply-to;
- fysieke/editoriale footer;
- privacy-URL;
- preferences-URL;
- standaard UTM-bron/medium;
- interne testadressen;
- trackingkeuzes;
- noodstop voor marketingmail.

API-keys en webhook secrets worden nooit in UI teruggetoond. Hoogstens `configured / missing` status.

## Rollen in UX

### Viewer

- ziet campagnes en resultaten;
- ziet gemaskeerde recipientdata;
- geen editorcontrols of test/send.

### Journalist

- maakt en bewerkt;
- dupliceert;
- test;
- kiest publiek;
- plant/verstuurt;
- ziet deliverydetails.

### Admin

- alles van Journalist;
- senderconfig;
- userrollen;
- manual suppress/unsuppress;
- recoveryacties;
- marketingnoodstop en gecontroleerde recovery; geen override van verplichte testmail in MVP.

Als later aparte Publisherrol gewenst is, kan sendpermission los van journalistrol worden gemaakt zonder contentmodel te wijzigen.

## Foutstaten

### Opslaan faalt

- editor blijft bruikbaar;
- persistent rode status;
- retry;
- lokale in-memory content niet wissen;
- navigatie waarschuwen;
- optie document JSON veilig naar klembord downloaden is nuttig als noodherstel.

### Conflict

- toon andere editor en tijdstip;
- vergelijk metadata;
- “Laad nieuwste”;
- “Bewaar mijn versie als nieuw concept”;
- nooit silent overwrite.

### Preview/render faalt

- foutcode, geen intern stacktrace;
- link naar laatste geldige revisie;
- sendknoppen geblokkeerd.

### Audience faalt

- vorige count als “verouderd” markeren;
- finale send blokkeren;
- retry.

### Sendconfig ontbreekt

- gerichte fout, bijvoorbeeld `Afzenderdomein nog niet geverifieerd`;
- Adminlink naar instellingen;
- geen generieke “Er ging iets mis”.

## Meldingen

In-app:

- geplande send geannuleerd/gestart;
- send afgerond;
- gedeeltelijke failure;
- bounce/complaint spike;
- verschil tussen preview count en finale scheduled-send count, uitsluitend informatief.

Optioneel later transactionele adminmail naar redactie. Geen Slack/Twilio toevoegen zonder expliciete keuze.

## Toegankelijkheid

- volledige keyboardbediening voor editorcommands, block picker en audiencechips;
- focus trap in modals;
- duidelijke headings en landmarks;
- status niet alleen via kleur;
- live regions voor save/sendprogress;
- form errors via `aria-describedby`;
- knoppen met concreet label;
- voldoende contrast;
- reduced motion;
- tabvolgorde volgt visuele volgorde;
- finale confirm is bruikbaar zonder muis.

## Audit-UX

Elke campaign heeft een inklapbare activiteitstijdlijn:

- wie;
- welke actie;
- wanneer;
- van/naar status;
- revision/audienceversie;
- reden bij recovery of manual suppression.

Toon geen volledige editorbodydiff in de timeline. Een revisievergelijking kan later afzonderlijk worden gebouwd.

## Copytone

- concreet en redactioneel;
- geen technische Resend-/queuejargon tenzij in diagnose;
- aantallen en gevolgen expliciet;
- destructieve knoppen beschrijven exact wat gebeurt;
- nooit “Succes!” wanneer alleen queueacceptatie bekend is.

Voorbeeld:

> **Verzending gestart**  
> 1.284 ontvangers zijn voorbereid. De aflevering loopt op de achtergrond; je kunt dit venster sluiten.
