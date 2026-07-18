import { COMPLIANCE } from "./compliance";

const ARTICLE_SLUG_PATTERN = "[a-z0-9]+(?:-[a-z0-9]+)*";

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function articleUrlPattern(siteBase: string): RegExp {
  return new RegExp(
    `${escapeRegExp(siteBase)}/nieuws/(${ARTICLE_SLUG_PATTERN})(?:[?#][^"'\\s<)]*)?`,
    "gu",
  );
}

export function collectArticleSlugs(
  siteBase: string,
  contents: readonly string[],
): Set<string> {
  const slugs = new Set<string>();
  for (const content of contents) {
    for (const match of content.matchAll(articleUrlPattern(siteBase))) {
      const slug = match[1];
      if (slug) {
        slugs.add(slug);
      }
    }
  }
  return slugs;
}

export function replaceArticleLinks(
  content: string,
  siteBase: string,
  articleToken: string,
): string {
  return content.replace(
    articleUrlPattern(siteBase),
    (_match, slug: string) =>
      `${siteBase}/email/artikel?token=${encodeURIComponent(articleToken)}&slug=${encodeURIComponent(slug)}`,
  );
}

export function replacePreferencesLinks(
  content: string,
  siteBase: string,
  preferencesUrl: string,
): string {
  return content
    .replaceAll(`${siteBase}/email/voorkeuren`, preferencesUrl)
    .replaceAll(`${siteBase}${COMPLIANCE.preferencesPath}`, preferencesUrl);
}
