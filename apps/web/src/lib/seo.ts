import type { Article } from "../content/articles";
import { SITE_URL } from "./content";

export function articleUrl(article: Article): string {
  return `${SITE_URL}/nieuws/${article.slug}`;
}

export function buildNewsArticleJsonLd(article: Article) {
  const gatedFields = article.isGated
    ? {
        isAccessibleForFree: false,
        hasPart: {
          "@type": "WebPageElement",
          isAccessibleForFree: false,
          cssSelector: ".paywall",
        },
      }
    : {
        isAccessibleForFree: true,
      };

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl(article),
    },
    headline: article.headline,
    description: article.dek,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: "De Voetbalgazet",
      url: SITE_URL,
    },
    articleSection: article.category,
    inLanguage: "nl-BE",
    ...gatedFields,
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
