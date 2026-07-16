import type { Article, ArticleBlock } from "../content/articles";
import { articles } from "../content/articles";

export const SITE_URL = "https://devoetbalgazet.be";
export const CONSENT_VERSION = "2026-07-16";

export type ArticleSections = {
  lead: readonly ArticleBlock[];
  gated: readonly ArticleBlock[];
};

export function getPublishedArticles(): readonly Article[] {
  return articles
    .filter((article) => article.status === "published")
    .toSorted((left, right) =>
      right.publishedAt.localeCompare(left.publishedAt),
    );
}

export function splitArticle(article: Article): ArticleSections {
  let paragraphsSeen = 0;
  let splitIndex = article.body.length;

  for (const [index, block] of article.body.entries()) {
    if (block.type === "paragraph") {
      paragraphsSeen += 1;
    }
    if (paragraphsSeen >= article.leadParagraphCount) {
      splitIndex = index + 1;
      break;
    }
  }

  return {
    lead: article.body.slice(0, splitIndex),
    gated: article.body.slice(splitIndex),
  };
}

export function formatArticleDate(isoDate: string): string {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Brussels",
  }).format(new Date(isoDate));
}

export function excerptArticle(article: Article, maxWords = 220): string {
  const { lead } = splitArticle(article);
  const words = lead
    .filter(
      (block): block is Extract<ArticleBlock, { type: "paragraph" }> =>
        block.type === "paragraph",
    )
    .flatMap((block) => block.text.split(/\s+/u))
    .slice(0, maxWords);
  return words.join(" ");
}

export function validateArticles(
  collection: readonly Article[] = articles,
): readonly string[] {
  const errors: string[] = [];
  const seenSlugs = new Set<string>();

  for (const article of collection) {
    if (seenSlugs.has(article.slug)) {
      errors.push(`Dubbele artikelslug: ${article.slug}`);
    }
    seenSlugs.add(article.slug);

    const paragraphCount = article.body.filter(
      (block) => block.type === "paragraph",
    ).length;
    if (
      article.status === "published" &&
      article.isGated &&
      (article.leadParagraphCount < 2 ||
        article.leadParagraphCount >= paragraphCount)
    ) {
      errors.push(
        `${article.slug}: een gated artikel vereist 2–3 lead-alinea's en minstens één gated alinea.`,
      );
    }
    if (!article.headline.trim() || !article.dek.trim() || !article.authorKey) {
      errors.push(`${article.slug}: verplichte publicatiemetadata ontbreekt.`);
    }
  }

  return errors;
}

const validationErrors = validateArticles();
if (validationErrors.length > 0) {
  throw new Error(`Ongeldige artikelcontent:\n${validationErrors.join("\n")}`);
}
