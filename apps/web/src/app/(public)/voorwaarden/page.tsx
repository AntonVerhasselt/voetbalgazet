import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gebruiksvoorwaarden",
  description:
    "Voorwaarden voor het gebruik van De Voetbalgazet en het gratis lezersabonnement.",
  alternates: { canonical: "/voorwaarden" },
};

export default function TermsPage() {
  return (
    <main className="shell legal-page">
      <header>
        <p className="eyebrow">Duidelijke afspraken</p>
        <h1>Gebruiksvoorwaarden van De Voetbalgazet</h1>
        <p>Laatste update: 16 juli 2026</p>
      </header>

      <section>
        <h2>1. Uitgever</h2>
        <address>
          <strong>YARU DAKEN BV</strong>
          <br />
          Van Duyststraat 60, 2100 Antwerpen, België
          <br />
          KBO 1017.634.522 · btw BE 1017.634.522
          <br />
          <a href="mailto:redactie@devoetbalgazet.be">
            redactie@devoetbalgazet.be
          </a>
        </address>
      </section>

      <section>
        <h2>2. De dienst en je abonnement</h2>
        <p>
          De Voetbalgazet publiceert nieuws, interviews en analyses over lokaal
          voetbal. Een abonnement is momenteel gratis. Bij je eerste
          inschrijving krijg je toegang tot gated artikels en ontvang je de
          wekelijkse nieuwsbrief.
        </p>
        <ul>
          <li>Je toegang wordt normaal 90 dagen op je apparaat onthouden.</li>
          <li>Je kunt de nieuwsbrief altijd gratis uitschrijven.</li>
          <li>Uitschrijven verwijdert je website-toegang niet.</li>
          <li>
            Een toekomstige betalende formule wordt nooit zonder je
            uitdrukkelijke akkoord geactiveerd.
          </li>
        </ul>
        <p>
          Een e-mailadres opgeven dat niet van jou is of
          beveiligingsmechanismen misbruiken is niet toegestaan.
        </p>
      </section>

      <section>
        <h2>3. Nieuwsbrief</h2>
        <p>
          De nieuwsbrief verschijnt normaal wekelijks, maar frequentie en
          publicatiemoment kunnen wijzigen. Elke nieuwsbrief bevat een
          uitschrijflink. Noodzakelijke berichten over toegang, beveiliging of
          privacy kunnen blijven komen zolang je website-toegang actief is.
        </p>
      </section>

      <section>
        <h2>4. Intellectuele eigendom</h2>
        <p>
          Teksten, beelden, illustraties, logo en vormgeving zijn beschermd. Je
          mag artikellinks delen en korte citaten met duidelijke bron
          gebruiken. Systematisch kopiëren, herpubliceren of scrapen voor een
          concurrerende publicatie of dataset is niet toegestaan zonder
          voorafgaande schriftelijke toestemming.
        </p>
      </section>

      <section>
        <h2>5. Zorgvuldigheid en aansprakelijkheid</h2>
        <p>
          We proberen informatie zorgvuldig en actueel te houden, maar kunnen
          niet garanderen dat elke publicatie foutloos of voortdurend
          beschikbaar is. Voor zover de Belgische wet dat toestaat, zijn we
          niet aansprakelijk voor indirecte schade door tijdelijke
          onbeschikbaarheid of externe links.
        </p>
        <p>
          Een feitelijke fout of rechtzetting kun je melden via{" "}
          <a href="mailto:redactie@devoetbalgazet.be">
            redactie@devoetbalgazet.be
          </a>{" "}
          met de artikel-URL en een duidelijke toelichting.
        </p>
      </section>

      <section>
        <h2>6. Recht, wijzigingen en privacy</h2>
        <p>
          Belgisch recht is van toepassing, met behoud van dwingende
          consumentenrechten. We kunnen deze voorwaarden aanpassen; de actuele
          versie en datum staan altijd op deze pagina. Lees in onze{" "}
          <Link href="/privacy">privacyverklaring</Link> hoe we persoonsgegevens
          verwerken.
        </p>
      </section>
    </main>
  );
}
