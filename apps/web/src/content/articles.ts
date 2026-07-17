import type { Node as MarkdocNode } from "@markdoc/markdoc";

export type ArticleStatus = "draft" | "published" | "archived";
export type IllustrationTone = "green" | "red" | "gold";

export type Article = {
  slug: string;
  status: ArticleStatus;
  publishedAt: string | null;
  updatedAt: string | null;
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
  heroImage: string | null;
  socialImage: string | null;
  heroAlt: string;
  heroCredit: string;
  illustrationTone: IllustrationTone;
  illustrationTitle: string;
  illustrationSubtitle: string;
  readingTime: string;
  seoTitle: string;
  seoDescription: string;
  canonicalOverride: string | null;
  excludeFromSearch: boolean;
  body: MarkdocNode;
};

export type PublishedArticle = Article & {
  status: "published";
  publishedAt: string;
};
