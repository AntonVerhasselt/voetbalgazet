import type { Metadata } from "next";
import { ArchiveBrowser } from "@/components/archive-browser";
import { getPublishedArticles } from "@/lib/content";

export const metadata: Metadata = {
  title: "Archief",
  description:
    "Doorzoek verhalen, interviews en analyses uit het lokale voetbal in Vlaanderen.",
  alternates: {
    canonical: "/archief",
  },
};

export default async function ArchivePage() {
  const entries = (await getPublishedArticles()).map((article) => ({
    slug: article.slug,
    headline: article.headline,
    dek: article.dek,
    category: article.category,
    categoryKey: article.categoryKey,
    provinceKey: article.provinceKey,
    divisionKeys: article.divisionKeys,
    teamKeys: article.teamKeys,
    publishedAt: article.publishedAt,
    readingTime: article.readingTime,
  }));

  return (
    <main className="shell archive-page">
      <header className="archive-page__header">
        <p className="eyebrow">Alle verhalen</p>
        <h1>Het archief</h1>
        <p>
          Zoek op onderwerp, provincie, reeks, club of jaar. De volledige
          redactionele index blijft voor iedere bezoeker hetzelfde.
        </p>
      </header>
      <ArchiveBrowser entries={entries} />
    </main>
  );
}
