export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string; attribution: string };

export type Article = {
  slug: string;
  status: "published";
  publishedAt: string;
  updatedAt?: string;
  author: string;
  headline: string;
  dek: string;
  kicker: string;
  category: string;
  isGated: boolean;
  featured: boolean;
  textOnly: boolean;
  heroAlt: string;
  readingTime: string;
  body: readonly ArticleBlock[];
};

export const articles = [
  {
    slug: "zondagen-langs-de-lijn",
    status: "published",
    publishedAt: "2026-07-12T08:00:00.000Z",
    author: "Redactie De Voetbalgazet",
    headline: "Waarom de mooiste voetbalverhalen nog altijd langs de lijn beginnen",
    dek: "Van de krijtlijnen in Duffel tot de kantine in Lier: lokaal voetbal leeft bij de mensen die elke zondag opnieuw komen opdagen.",
    kicker: "Essay",
    category: "Clubnieuws",
    isGated: false,
    featured: true,
    textOnly: true,
    heroAlt:
      "Typografische illustratie met de woorden Zondag langs de lijn.",
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
] as const satisfies readonly Article[];

export function getArticle(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}
