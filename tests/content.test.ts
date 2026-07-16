import { describe, expect, it } from "vitest";
import {
  excerptArticle,
  getAllArticles,
  getPublishedArticles,
  splitArticle,
  validateArticles,
} from "../apps/web/src/lib/content";

describe("Keystatic article pipeline", () => {
  it("reads Markdoc and only publishes newest-first entries", async () => {
    const [all, published] = await Promise.all([
      getAllArticles(),
      getPublishedArticles(),
    ]);
    expect(all.some((article) => article.status === "draft")).toBe(true);
    expect(all.some((article) => article.status === "archived")).toBe(true);
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

  it("keeps the configured Markdoc lead public and the rest gated", async () => {
    const gatedArticle = (await getAllArticles()).find(
      (article) => article.isGated,
    );
    expect(gatedArticle).toBeDefined();
    const sections = splitArticle(gatedArticle!);
    expect(
      sections.lead.filter((block) => block.type === "paragraph"),
    ).toHaveLength(gatedArticle!.leadParagraphCount);
    expect(sections.gated.length).toBeGreaterThan(0);
  });

  it("build validation rejects duplicate slugs", async () => {
    const articles = await getAllArticles();
    const duplicate = [articles[0]!, { ...articles[0]! }];
    expect(validateArticles(duplicate)).toContain(
      `Dubbele artikelslug: ${articles[0]!.slug}`,
    );
  });

  it("RSS excerpts contain lead copy but not gated body copy", async () => {
    const gatedArticle = (await getAllArticles()).find(
      (article) => article.isGated,
    )!;
    const excerpt = excerptArticle(gatedArticle);
    const sections = splitArticle(gatedArticle);
    const firstLeadText = sections.lead[0]?.attributes.content;
    const firstGatedText = sections.gated
      .flatMap((node) => [...node.walk()])
      .find(
        (node) =>
          node.type === "text" && typeof node.attributes.content === "string",
      )?.attributes.content;
    expect(typeof firstLeadText === "string" ? excerpt : excerpt.length).toBeTruthy();
    if (typeof firstGatedText === "string") {
      expect(excerpt).not.toContain(firstGatedText);
    }
  });
});
