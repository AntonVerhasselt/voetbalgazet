import path from "node:path";
import Markdoc from "@markdoc/markdoc";
import { createReader } from "@keystatic/core/reader";
import { createGitHubReader } from "@keystatic/core/reader/github";
import keystaticConfig, {
  articleMarkdocConfig,
} from "../../keystatic.config";
import type {
  Article,
  IllustrationTone,
  PublishedArticle,
} from "../content/articles";

export const SITE_URL = "https://devoetbalgazet.be";
export const CONSENT_VERSION = "2026-07-16";

export type ArticleSections = {
  lead: readonly Markdoc.Node[];
  gated: readonly Markdoc.Node[];
};

export type ContentStatus = {
  drafts: number;
  published: number;
  archived: number;
};

type ContentSnapshot = {
  articles: readonly Article[];
  settings: {
    authors: ReadonlySet<string>;
    authorLabels: ReadonlyMap<string, string>;
    categories: ReadonlySet<string>;
    categoryLabels: ReadonlyMap<string, string>;
    divisions: ReadonlySet<string>;
    teams: ReadonlyMap<string, readonly string[]>;
  };
};

function appRoot(): string {
  return process.cwd().endsWith(`${path.sep}apps${path.sep}web`)
    ? process.cwd()
    : path.join(process.cwd(), "apps", "web");
}

const localReader = createReader(appRoot(), keystaticConfig);

function readerForBranch(branch?: string) {
  if (!branch) {
    return localReader;
  }
  const token = process.env.KEYSTATIC_GITHUB_READER_TOKEN?.trim();
  if (!token) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Draftpreview vereist KEYSTATIC_GITHUB_READER_TOKEN voor branchcontent.",
      );
    }
    return localReader;
  }
  return createGitHubReader(keystaticConfig, {
    repo: "AntonVerhasselt/voetbalgazet",
    pathPrefix: "apps/web",
    ref: branch,
    token,
  });
}

function normalizeOptional(value: string | null): string {
  return value?.trim() ?? "";
}

function wordCount(node: Markdoc.Node): number {
  let count = 0;
  for (const child of node.walk()) {
    const content = child.attributes.content;
    if (child.type === "text" && typeof content === "string") {
      count += content.trim().split(/\s+/u).filter(Boolean).length;
    }
  }
  return count;
}

function resolvedTone(
  tone: "green" | "red" | "gold" | "auto",
  slug: string,
): IllustrationTone {
  if (tone !== "auto") {
    return tone;
  }
  const tones = ["green", "red", "gold"] as const;
  const checksum = [...slug].reduce(
    (total, character) => total + character.codePointAt(0)!,
    0,
  );
  return tones[checksum % tones.length]!;
}

async function readSnapshot(branch?: string): Promise<ContentSnapshot> {
  const reader = readerForBranch(branch);
  const [
    entries,
    authors,
    categories,
    divisions,
    teams,
  ] = await Promise.all([
    reader.collections.articles.all({ resolveLinkedFiles: true }),
    reader.singletons.authors.readOrThrow(),
    reader.singletons.categories.readOrThrow(),
    reader.singletons.divisions.readOrThrow(),
    reader.singletons.teams.readOrThrow(),
  ]);

  const authorLabels = new Map(
    authors.items.map((author) => [author.key, author.displayName]),
  );
  const categoryLabels = new Map(
    categories.items.map((category) => [category.key, category.label]),
  );
  const teamDivisions = new Map(
    teams.items.map((team) => [team.key, team.divisionKeys]),
  );

  const articles = entries.map(({ slug, entry }) => {
    const words = wordCount(entry.body.node);
    return {
      slug,
      status: entry.status,
      publishedAt: entry.publishedAt,
      updatedAt: entry.updatedAt,
      authorKey: entry.author,
      author: authorLabels.get(entry.author) ?? entry.author,
      headline: entry.headline.trim(),
      dek: entry.dek.trim(),
      kicker: normalizeOptional(entry.kicker),
      categoryKey: entry.category,
      category: categoryLabels.get(entry.category) ?? entry.category,
      provinceKey: entry.province,
      divisionKeys: entry.divisionKeys,
      teamKeys: entry.teamKeys,
      isGated: entry.isGated,
      leadParagraphCount: entry.leadParagraphCount,
      featured: entry.featured,
      heroImage: entry.heroImage,
      socialImage: entry.socialImage,
      heroAlt: normalizeOptional(entry.heroAlt),
      heroCredit: normalizeOptional(entry.heroCredit),
      illustrationTone: resolvedTone(entry.illustrationTone, slug),
      homeTeam: normalizeOptional(entry.homeTeam),
      awayTeam: normalizeOptional(entry.awayTeam),
      competitionLabel: normalizeOptional(entry.competitionLabel),
      readingTime: `${Math.max(1, Math.ceil(words / 210))} min. leestijd`,
      seoTitle: normalizeOptional(entry.seoTitle),
      seoDescription: normalizeOptional(entry.seoDescription),
      canonicalOverride: entry.canonicalOverride,
      excludeFromSearch: entry.excludeFromSearch,
      body: entry.body.node,
    } satisfies Article;
  });

  const snapshot = {
    articles,
    settings: {
      authors: new Set(authors.items.map((author) => author.key)),
      authorLabels,
      categories: new Set(categories.items.map((category) => category.key)),
      categoryLabels,
      divisions: new Set(divisions.items.map((division) => division.key)),
      teams: teamDivisions,
    },
  } satisfies ContentSnapshot;

  const errors = validateArticles(snapshot.articles, snapshot.settings);
  if (errors.length > 0) {
    throw new Error(`Ongeldige artikelcontent:\n${errors.join("\n")}`);
  }
  return snapshot;
}

export async function getAllArticles(branch?: string): Promise<readonly Article[]> {
  return (await readSnapshot(branch)).articles;
}

export async function getPublishedArticles(): Promise<
  readonly PublishedArticle[]
> {
  const articles = await getAllArticles();
  return articles
    .filter(
      (article): article is PublishedArticle =>
        article.status === "published" && article.publishedAt !== null,
    )
    .toSorted((left, right) =>
      right.publishedAt.localeCompare(left.publishedAt),
    );
}

export async function getArticle(
  slug: string,
  branch?: string,
): Promise<Article | undefined> {
  return (await getAllArticles(branch)).find((article) => article.slug === slug);
}

export async function getContentStatus(): Promise<ContentStatus> {
  const articles = await getAllArticles();
  return {
    drafts: articles.filter((article) => article.status === "draft").length,
    published: articles.filter((article) => article.status === "published").length,
    archived: articles.filter((article) => article.status === "archived").length,
  };
}

export function splitArticle(article: Article): ArticleSections {
  let paragraphsSeen = 0;
  let splitIndex = article.body.children.length;

  for (const [index, block] of article.body.children.entries()) {
    if (block.type === "paragraph") {
      paragraphsSeen += 1;
    }
    if (paragraphsSeen >= article.leadParagraphCount) {
      splitIndex = index + 1;
      break;
    }
  }

  return {
    lead: article.body.children.slice(0, splitIndex),
    gated: article.body.children.slice(splitIndex),
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

function plainText(nodes: readonly Markdoc.Node[]): string {
  const words: string[] = [];
  for (const node of nodes) {
    for (const child of node.walk()) {
      const content = child.attributes.content;
      if (child.type === "text" && typeof content === "string") {
        words.push(content);
      }
    }
  }
  return words.join(" ").replaceAll(/\s+/gu, " ").trim();
}

export function excerptArticle(article: Article, maxWords = 220): string {
  return plainText(splitArticle(article).lead)
    .split(/\s+/u)
    .slice(0, maxWords)
    .join(" ");
}

function isSafeLink(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

function validateMarkdoc(article: Article): string[] {
  const errors = Markdoc.validate(article.body, articleMarkdocConfig).map(
    (error) => `${article.slug}: ${error.message}`,
  );
  for (const node of article.body.walk()) {
    const href = node.attributes.href;
    if (node.type === "link" && typeof href === "string" && !isSafeLink(href)) {
      errors.push(`${article.slug}: onveilige link "${href}".`);
    }
  }
  return errors;
}

export function validateArticles(
  collection: readonly Article[],
  settings?: ContentSnapshot["settings"],
): readonly string[] {
  const errors: string[] = [];
  const seenSlugs = new Set<string>();

  for (const article of collection) {
    if (seenSlugs.has(article.slug)) {
      errors.push(`Dubbele artikelslug: ${article.slug}`);
    }
    seenSlugs.add(article.slug);

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(article.slug)) {
      errors.push(`${article.slug}: slug is niet URL-veilig.`);
    }
    if (article.status === "published" && !article.publishedAt) {
      errors.push(`${article.slug}: een gepubliceerd artikel mist publishedAt.`);
    }
    if (!article.headline || !article.dek || !article.authorKey) {
      errors.push(`${article.slug}: verplichte publicatiemetadata ontbreekt.`);
    }
    if (article.heroImage && !article.heroAlt) {
      errors.push(`${article.slug}: het hoofdbeeld mist alternatieve tekst.`);
    }
    if (
      article.canonicalOverride &&
      !isSafeLink(article.canonicalOverride)
    ) {
      errors.push(`${article.slug}: de canonieke URL is ongeldig.`);
    }

    const paragraphCount = article.body.children.filter(
      (block) => block.type === "paragraph",
    ).length;
    if (
      article.isGated &&
      (article.leadParagraphCount < 2 ||
        article.leadParagraphCount > 3 ||
        article.leadParagraphCount >= paragraphCount)
    ) {
      errors.push(
        `${article.slug}: een gated artikel vereist 2–3 lead-alinea's en minstens één gated alinea.`,
      );
    }

    if (settings) {
      if (!settings.authors.has(article.authorKey)) {
        errors.push(`${article.slug}: onbekende auteur "${article.authorKey}".`);
      }
      if (!settings.categories.has(article.categoryKey)) {
        errors.push(
          `${article.slug}: onbekende categorie "${article.categoryKey}".`,
        );
      }
      for (const divisionKey of article.divisionKeys) {
        if (!settings.divisions.has(divisionKey)) {
          errors.push(`${article.slug}: onbekende reeks "${divisionKey}".`);
        }
      }
      for (const teamKey of article.teamKeys) {
        const teamDivisionKeys = settings.teams.get(teamKey);
        if (!teamDivisionKeys) {
          errors.push(`${article.slug}: onbekende club "${teamKey}".`);
        } else if (
          !teamDivisionKeys.some((key) => article.divisionKeys.includes(key))
        ) {
          errors.push(
            `${article.slug}: club "${teamKey}" hoort niet bij een gekozen reeks.`,
          );
        }
      }
    }
    errors.push(...validateMarkdoc(article));
  }

  return errors;
}
