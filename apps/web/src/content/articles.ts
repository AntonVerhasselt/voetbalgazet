export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string; attribution: string };

export type Article = {
  slug: string;
  status: "draft" | "published";
  publishedAt: string;
  updatedAt?: string;
  authorKey: string;
  author: string;
  headline: string;
  dek: string;
  kicker: string;
  categoryKey: string;
  category: string;
  provinceKey: string;
  divisionKeys: readonly string[];
  teamKeys: readonly string[];
  isGated: boolean;
  leadParagraphCount: number;
  featured: boolean;
  textOnly: boolean;
  heroAlt: string;
  illustrationTone: "green" | "red" | "gold";
  readingTime: string;
  body: readonly ArticleBlock[];
};

export const articles = [
  {
    slug: "zondagen-langs-de-lijn",
    status: "published",
    publishedAt: "2026-07-12T08:00:00.000Z",
    authorKey: "redactie",
    author: "Redactie De Voetbalgazet",
    headline: "Waarom de mooiste voetbalverhalen nog altijd langs de lijn beginnen",
    dek: "Van de krijtlijnen in Duffel tot de kantine in Lier: lokaal voetbal leeft bij de mensen die elke zondag opnieuw komen opdagen.",
    kicker: "Essay",
    categoryKey: "clubnieuws",
    category: "Clubnieuws",
    provinceKey: "antwerpen",
    divisionKeys: ["antwerpen-p1"],
    teamKeys: ["kfc-duffel"],
    isGated: false,
    leadParagraphCount: 2,
    featured: true,
    textOnly: true,
    heroAlt:
      "Typografische illustratie met de woorden Zondag langs de lijn.",
    illustrationTone: "green",
    readingTime: "4 min. leestijd",
    body: [
      {
        type: "paragraph",
        text: "Nog voor de eerste bal rolt, is het terrein al wakker. Een vrijwilliger zet de cornervlaggen recht, iemand draagt een bak koffie naar de kantine en aan de omheining wordt de opstelling besproken alsof er een finale op het spel staat.",
      },
      {
        type: "paragraph",
        text: "Dat is de wereld waar De Voetbalgazet naar kijkt. Niet alleen naar de uitslag, maar naar de mensen, gewoontes en kleine beslissingen die een club bij elkaar houden.",
      },
      {
        type: "heading",
        text: "Meer dan negentig minuten",
      },
      {
        type: "paragraph",
        text: "In het lokale voetbal loopt de sport naadloos over in het dorpsleven. Spelers trainen na hun werk, jeugdcoaches beantwoorden laat op de avond nog berichten van ouders en bestuursleden zoeken tegelijk een nieuwe spits en iemand die op zaterdag de afwas kan doen.",
      },
      {
        type: "quote",
        text: "Een club is pas sterk wanneer iedereen zich er een beetje eigenaar van voelt.",
        attribution: "Een jeugdtrainer uit de provincie Antwerpen",
      },
      {
        type: "paragraph",
        text: "Precies daarom verdienen deze verhalen dezelfde aandacht en zorg als de grote affiches. Een beslissende derby, een afscheid na twintig seizoenen of de terugkeer van een jeugdproduct vertelt iets over voetbal én over de plek waar het gespeeld wordt.",
      },
      {
        type: "heading",
        text: "Een gazet voor dichtbij",
      },
      {
        type: "paragraph",
        text: "De Voetbalgazet wil die verhalen verzamelen in een heldere, rustige vorm. Zonder eindeloze stroom, zonder schreeuwerige scorebordlogica. Wel met verslaggeving die weet wie er speelt, waarom het ertoe doet en wat er na het laatste fluitsignaal blijft hangen.",
      },
      {
        type: "paragraph",
        text: "We beginnen klein en dichtbij. Langs de lijn, in de tribune en aan de toog. Daar waar het voetbal elke week opnieuw van iedereen wordt.",
      },
    ],
  },
  {
    slug: "de-kracht-van-de-derde-helft",
    status: "published",
    publishedAt: "2026-07-15T06:30:00.000Z",
    authorKey: "lotte-vermeiren",
    author: "Lotte Vermeiren",
    headline: "De derde helft houdt een voetbalclub recht",
    dek: "Bij KFC Duffel wordt na de training niet alleen over tactiek gesproken. In de kantine ontstaan de plannen die de club door een lang seizoen dragen.",
    kicker: "Reportage · P1 Antwerpen",
    categoryKey: "clubnieuws",
    category: "Clubnieuws",
    provinceKey: "antwerpen",
    divisionKeys: ["antwerpen-p1"],
    teamKeys: ["kfc-duffel"],
    isGated: true,
    leadParagraphCount: 3,
    featured: false,
    textOnly: true,
    heroAlt:
      "Typografische illustratie over de derde helft bij een lokale voetbalclub.",
    illustrationTone: "red",
    readingTime: "6 min. leestijd",
    body: [
      {
        type: "paragraph",
        text: "De laatste trainingsbal ligt nog maar net in het net wanneer het licht in de kantine aanspringt. Natte schoenen blijven bij de deur staan, de eerste glazen verschijnen op tafel en de analyse van de avond begint vanzelf.",
      },
      {
        type: "paragraph",
        text: "Voor buitenstaanders is het een nabespreking. Voor de mensen van de club is dit het uur waarin afspraken worden gemaakt, vrijwilligers worden gevonden en kleine zorgen worden opgevangen voordat ze groot worden.",
      },
      {
        type: "paragraph",
        text: "De derde helft is geen romantisch extraatje. Ze is een werkvergadering zonder agenda, een onthaalmoment en soms zelfs een hulplijn voor wie naast het veld een moeilijke week had.",
      },
      {
        type: "heading",
        text: "Iedereen heeft een taak",
      },
      {
        type: "paragraph",
        text: "Aan de lange tafel zit de doelman naast de terreinverzorger. Een ouder vraagt wie zaterdag de jeugdtruitjes kan wassen. De kapitein noteert twee namen voor de mosselsouper. Niemand noemt het bestuur, maar iedereen bestuurt een stukje mee.",
      },
      {
        type: "quote",
        text: "Als mensen na de match nog een uur blijven, weet je dat de club meer is dan het klassement.",
        attribution: "Een vrijwilliger van KFC Duffel",
      },
      {
        type: "paragraph",
        text: "Die verbondenheid lost niet elk probleem op. Ook hier zijn er te weinig handen en te veel zaterdagen. Toch maakt de gewoonte om samen te blijven het makkelijker om hulp te vragen en verantwoordelijkheid te delen.",
      },
      {
        type: "heading",
        text: "Een stille transfermarkt",
      },
      {
        type: "paragraph",
        text: "Nieuwe spelers leren in de kantine sneller hoe de club werkt dan tijdens hun eerste oefenwedstrijd. Ze horen wie altijd vroeg komt, welke derby echt gevoelig ligt en waarom één stoel aan het raam voorbehouden blijft voor een oud-bestuurslid.",
      },
      {
        type: "paragraph",
        text: "Wanneer de lichten uiteindelijk doven, is de uitslag van zondag nog altijd onbekend. Maar de was is geregeld, de jeugd heeft vervoer en een nieuwe speler kent drie extra namen. Ook dat is voorbereiding.",
      },
    ],
  },
  {
    slug: "jeugdtrainer-met-een-plan",
    status: "published",
    publishedAt: "2026-07-14T16:00:00.000Z",
    authorKey: "milan-de-smet",
    author: "Milan De Smet",
    headline: "De jeugdtrainer die winnen opnieuw leerde uitleggen",
    dek: "In Vlaams-Brabant meet een trainer vooruitgang niet alleen in doelpunten, maar ook in keuzes, durf en het gesprek na de wedstrijd.",
    kicker: "Interview · Jeugd",
    categoryKey: "jeugd",
    category: "Jeugd",
    provinceKey: "vlaams-brabant",
    divisionKeys: ["vlaams-brabant-p1"],
    teamKeys: ["kvc-kessel-lo"],
    isGated: true,
    leadParagraphCount: 2,
    featured: false,
    textOnly: true,
    heroAlt:
      "Typografische illustratie over een jeugdtrainer langs het voetbalveld.",
    illustrationTone: "gold",
    readingTime: "5 min. leestijd",
    body: [
      {
        type: "paragraph",
        text: "Op woensdagmiddag liggen er geen kegels in een perfect patroon. Trainer Bram laat zijn spelers eerst zelf een veld bouwen. Ze overleggen over ruimte, regels en wat een eerlijke oefening nodig heeft.",
      },
      {
        type: "paragraph",
        text: "Het lijkt tijdverlies, tot de bal rolt. De spelers coachen elkaar, passen de afstanden aan en begrijpen sneller waarom een oefening vastloopt. Bram kijkt vooral en stelt vragen.",
      },
      {
        type: "heading",
        text: "De score is niet het enige verslag",
      },
      {
        type: "paragraph",
        text: "Na elke wedstrijd schrijft iedere speler één beslissing op waar hij trots op is en één moment dat hij opnieuw wil proberen. De uitslag staat bovenaan, maar krijgt niet automatisch de meeste plaats.",
      },
      {
        type: "quote",
        text: "Winnaars herkennen wat werkt. Jonge voetballers moeten dat eerst leren benoemen.",
        attribution: "Jeugdtrainer Bram",
      },
      {
        type: "paragraph",
        text: "Ouders moesten wennen aan die aanpak. Een nederlaag voelde soms te positief, een zege soms te kritisch. Na enkele maanden zagen ze dat spelers zelfstandiger werden en minder bang waren om een fout te maken.",
      },
      {
        type: "paragraph",
        text: "Voor Bram is dat de echte winst: spelers die na een mislukte actie opnieuw de bal vragen. Het klassement blijft bestaan, maar het bepaalt niet langer elk gesprek.",
      },
    ],
  },
  {
    slug: "zomertransfers-zonder-paniek",
    status: "published",
    publishedAt: "2026-07-13T10:15:00.000Z",
    authorKey: "redactie",
    author: "Redactie De Voetbalgazet",
    headline: "Waarom slimme zomertransfers beginnen met luisteren",
    dek: "Een kern bouwen is meer dan namen verzamelen. Lokale clubs zoeken eerst naar rollen, beschikbaarheid en een kleedkamer die klopt.",
    kicker: "Analyse",
    categoryKey: "transfernieuws",
    category: "Transfernieuws",
    provinceKey: "oost-vlaanderen",
    divisionKeys: ["oost-vlaanderen-p1"],
    teamKeys: ["kfc-merelbeke"],
    isGated: false,
    leadParagraphCount: 2,
    featured: false,
    textOnly: true,
    heroAlt:
      "Typografische illustratie over zomertransfers in het lokale voetbal.",
    illustrationTone: "green",
    readingTime: "4 min. leestijd",
    body: [
      {
        type: "paragraph",
        text: "De opvallendste transfer is niet altijd de belangrijkste. In provinciale reeksen kan een betrouwbare trainingspartner meer veranderen dan een spits met een indrukwekkend verleden maar een onvoorspelbare agenda.",
      },
      {
        type: "paragraph",
        text: "Clubs die vroeg luisteren, ontdekken welke rol ontbreekt: leiderschap achterin, rust op het middenveld of simpelweg iemand die elke dinsdag en donderdag aanwezig kan zijn.",
      },
      {
        type: "heading",
        text: "Beschikbaarheid is een kwaliteit",
      },
      {
        type: "paragraph",
        text: "Werkuren, studies en jonge gezinnen wegen mee in elke keuze. De beste sportieve match houdt ook rekening met de week van een speler buiten het voetbal.",
      },
      {
        type: "paragraph",
        text: "Daarom begint een sterke zomer niet met een lijst namen, maar met duidelijke vragen. Wat verwacht de ploeg? Wie neemt verantwoordelijkheid? En welke belofte kan de club zelf waarmaken?",
      },
    ],
  },
] as const satisfies readonly Article[];

export function getArticle(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}
