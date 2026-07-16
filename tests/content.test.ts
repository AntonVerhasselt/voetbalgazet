import { describe, expect, it } from "vitest";
import { articles } from "../apps/web/src/content/articles";
import {
  excerptArticle,
  getPublishedArticles,
  splitArticle,
  validateArticles,
} from "../apps/web/src/lib/content";

describe("static article pipeline", () => {
  it("only returns published articles in newest-first order", () => {
    const published = getPublishedArticles();
    expect(published.length).toBeGreaterThan(1);
    expect(published.every((article) => article.status === "published")).toBe(
      true,
    );
    expect(
      published.every(
        (article, index) =>
          index === 0 ||
          published[index - 1]!.publishedAt >= article.publishedAt,
      ),
    ).toBe(true);
  });

  it("keeps the configured lead public and the rest gated", () => {
    const gatedArticle = articles.find((article) => article.isGated);
    expect(gatedArticle).toBeDefined();
    const sections = splitArticle(gatedArticle!);
    expect(
      sections.lead.filter((block) => block.type === "paragraph"),
    ).toHaveLength(gatedArticle!.leadParagraphCount);
    expect(sections.gated.length).toBeGreaterThan(0);
  });

  it("build validation rejects duplicate slugs", () => {
    const duplicate = [articles[0]!, { ...articles[0]! }];
    expect(validateArticles(duplicate)).toContain(
      `Dubbele artikelslug: ${articles[0]!.slug}`,
    );
  });

  it("RSS excerpts contain lead copy but not gated body copy", () => {
    const gatedArticle = articles.find((article) => article.isGated)!;
    const excerpt = excerptArticle(gatedArticle);
    const gatedText = splitArticle(gatedArticle).gated.find(
      (block) => block.type === "paragraph",
    );
    expect(excerpt).toContain(
      splitArticle(gatedArticle).lead[0]!.type === "paragraph"
        ? splitArticle(gatedArticle).lead[0]!.text
        : "",
    );
    if (gatedText?.type === "paragraph") {
      expect(excerpt).not.toContain(gatedText.text);
    }
  });
});
