import type { Metadata } from "next";
import { ArticleAccessGate } from "@/components/article-access-gate";

export const metadata: Metadata = {
  title: "Test · Abonneer-gate",
  robots: {
    index: false,
    follow: false,
  },
};

const leadParagraphs = [
  "De laatste trainingsbal ligt nog maar net in het net wanneer het licht in de kantine aanspringt. Natte schoenen blijven bij de deur staan, de eerste glazen verschijnen op tafel en de analyse van de avond begint vanzelf.",
  "Voor buitenstaanders is het een nabespreking. Voor de mensen van de club is dit het uur waarin afspraken worden gemaakt, vrijwilligers worden gevonden en kleine zorgen worden opgevangen voordat ze groot worden.",
  "De derde helft is geen romantisch extraatje. Ze is een werkvergadering zonder agenda, een onthaalmoment en soms zelfs een hulplijn voor wie naast het veld een moeilijke week had.",
] as const;

const gatedParagraphs = [
  "Aan de lange tafel zit de doelman naast de terreinverzorger. Een ouder vraagt wie zaterdag de jeugdtruitjes kan wassen. De kapitein noteert twee namen voor de mosselsouper. Niemand noemt het bestuur, maar iedereen bestuurt een stukje mee.",
  "In de hoek hangt een bord met openstaande taken: sleutelkast, koffiezet, ballenzak, sponsors bedanken. Wat ooit via WhatsApp verdwaalde, staat hier zwart op wit. De club heeft geleerd dat gezelligheid alleen werkt als iemand ook de vuile was doet — letterlijk.",
  "Later op de avond schuift een nieuwe vrijwilliger aan. Niemand maakt er een feest van, maar er is een stoel vrij en een tas koffie. Zo groeit een club: niet met slogans, maar met mensen die blijven zitten tot de afwas klaar is.",
  "Wie het volledige verhaal leest, ziet hoe die avond de week erna al verschil maakt: minder chaos, meer handen, en een kantine die nog lang blijft branden nadat de lichten op het veld uitgaan.",
] as const;

export default function SubscribeGateTestPage() {
  return (
    <main>
      <article className="article">
        <header className="article__header shell shell--article">
          <p className="eyebrow">Testpagina · e-mailgate</p>
          <h1>Abonneer-gate inline over het artikel</h1>
          <p className="dek">
            Lokale testpagina om de inline inschrijfsectie te bekijken en in te
            vullen. Niet geïndexeerd.
          </p>
          <div className="article-meta">
            <span>Demo-artikel</span>
            <span>Geen productiecontent</span>
          </div>
        </header>

        <div className="shell shell--article article__body">
          <ArticleAccessGate
            articleId="test-abonneer-gate"
            leadLength={leadParagraphs.length}
            demoMode
            preview={leadParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          >
            <div className="paywall" data-nosnippet>
              {gatedParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </ArticleAccessGate>
        </div>
      </article>
    </main>
  );
}
