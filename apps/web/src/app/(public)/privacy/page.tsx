import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_EMAIL, PUBLISHER_LINE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description:
    "Hoe De Voetbalgazet persoonsgegevens verwerkt voor artikeltoegang en de nieuwsbrief.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="shell legal-page">
      <header>
        <p className="eyebrow">Jouw gegevens</p>
        <h1>Privacyverklaring van De Voetbalgazet</h1>
        <p>Laatste update: 17 juli 2026</p>
      </header>

      <section>
        <h2>1. Wie is verantwoordelijk?</h2>
        <address>
          <strong>YARU DAKEN BV</strong>
          <br />
          Van Duyststraat 60, 2100 Antwerpen, België
          <br />
          KBO 1017.634.522 · btw BE 1017.634.522
          <br />
          Privacy &amp; support:{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
          <br />
          {PUBLISHER_LINE}
        </address>
      </section>

      <section>
        <h2>2. Welke gegevens verwerken we?</h2>
        <p>
          We bewaren je e-mailadres, gekozen voetbalreeksen, optioneel je
          favoriete club, abonnements- en consentstatus, verificatie- en
          afleverstatus en strikt noodzakelijke sessiegegevens. We verwerken
          ook beperkte cookieless gebruiksgegevens zoals bezochte paginatypes,
          artikel-ID&apos;s, inschrijfstappen en leesdiepte.
        </p>
        <p>
          We sturen geen ingevulde e-mailadressen, magic-linktokens of vrije
          formulierinhoud naar onze analyticsdienst.
        </p>
      </section>

      <section>
        <h2>3. Waarom verwerken we deze gegevens?</h2>
        <ul>
          <li>om je toegang te geven tot alle artikels;</li>
          <li>om je voorkeuren en wekelijkse nieuwsbrief te verzorgen;</li>
          <li>om je keuze en eventuele uitschrijving te kunnen aantonen;</li>
          <li>om misbruik en technische fouten te voorkomen;</li>
          <li>om de publieke site met privacyvriendelijke metingen te verbeteren.</li>
        </ul>
        <p>
          Artikeltoegang en strikt noodzakelijke sessies leveren de dienst die
          je vraagt. De nieuwsbrief versturen we op basis van je bevestigende
          inschrijfactie. Je kunt die toestemming altijd intrekken.
        </p>
      </section>

      <section>
        <h2>4. Inschrijving, cookies en nieuwsbrief</h2>
        <p>
          Na <strong>‘Abonneer en lees verder’</strong> krijg je direct toegang
          en ontvang je onze wekelijkse nieuwsbrief. De veilige bevestigingslink
          bewijst je e-mailadres, maar is niet nodig om meteen te lezen.
        </p>
        <p>
          Een strikt noodzakelijke HttpOnly-sessiecookie onthoudt je toegang
          maximaal 90 dagen en kan bij actief gebruik worden vernieuwd.
          Authenticatietokens staan niet in localStorage. Publieke analytics is
          standaard cookieless (geen trackingcookies) en session replay staat
          uit. We meten alleen geaggregeerde productevents zoals paginatypes,
          artikel-ID&apos;s, inschrijfstappen, leesdiepte, zoeklengte en
          technische fouten — nooit e-mailadressen of formuliertekst.
        </p>
        <p>
          Uitschrijven stopt alleen de nieuwsbrief. Je website-toegang blijft
          bestaan.
        </p>
      </section>

      <section>
        <h2>5. Verwerkers en bewaring</h2>
        <p>
          We gebruiken Convex voor backend en authenticatie, Vercel voor
          hosting, Resend voor e-mail en PostHog Cloud EU voor cookieless
          productanalytics. We verkopen je persoonsgegevens niet.
        </p>
        <p>
          Subscribergegevens blijven bewaard zolang je website-toegang actief
          is of tot een geldig verwijderverzoek. Actieve sessies duren maximaal
          90 dagen; beveiligingslogs 90 dagen; analytics en
          supportcorrespondentie maximaal 24 maanden.
        </p>
      </section>

      <section>
        <h2>6. Jouw rechten</h2>
        <p>
          Je kunt inzage, correctie, verwijdering, beperking, overdraagbaarheid
          of bezwaar vragen via{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
          . We kunnen je vragen je identiteit veilig te bevestigen. Je kunt ook
          klacht indienen bij de Belgische{" "}
          <a href="https://www.gegevensbeschermingsautoriteit.be/">
            Gegevensbeschermingsautoriteit
          </a>
          .
        </p>
      </section>

      <p className="legal-page__back">
        <Link href="/voorwaarden">Lees ook onze gebruiksvoorwaarden</Link>
      </p>
    </main>
  );
}
