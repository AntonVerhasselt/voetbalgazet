import type { Article, PublishedArticle } from "../content/articles";
import { DEFAULT_OG_IMAGE, SITE_URL } from "./site-config";

export function articleUrl(article: Article): string {
  return `${SITE_URL}/nieuws/${article.slug}`;
}

function absoluteUrl(value: string): string {
  return new URL(value, SITE_URL).toString();
}

export function buildNewsArticleJsonLd(article: PublishedArticle) {
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
    image: [
      absoluteUrl(article.socialImage ?? article.heroImage ?? DEFAULT_OG_IMAGE),
    ],
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
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(DEFAULT_OG_IMAGE),
      },
    },
    articleSection: article.category,
    inLanguage: "nl-BE",
    ...gatedFields,
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
