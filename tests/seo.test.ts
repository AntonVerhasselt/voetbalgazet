import { describe, expect, it } from "vitest";
import { articles } from "../apps/web/src/content/articles";
import {
  buildNewsArticleJsonLd,
  serializeJsonLd,
} from "../apps/web/src/lib/seo";

describe("NewsArticle structured data", () => {
  it("marks gated content with the paywall selector", () => {
    const article = articles.find((item) => item.isGated)!;
    const jsonLd = buildNewsArticleJsonLd(article);
    expect(jsonLd.isAccessibleForFree).toBe(false);
    expect(jsonLd).toMatchObject({
      hasPart: {
        cssSelector: ".paywall",
        isAccessibleForFree: false,
      },
    });
  });

  it("omits hasPart for free articles", () => {
    const article = articles.find((item) => !item.isGated)!;
    const jsonLd = buildNewsArticleJsonLd(article);
    expect(jsonLd.isAccessibleForFree).toBe(true);
    expect("hasPart" in jsonLd).toBe(false);
  });

  it("escapes less-than characters in inline JSON", () => {
    expect(serializeJsonLd({ value: "</script>" })).not.toContain("</script>");
  });
});
