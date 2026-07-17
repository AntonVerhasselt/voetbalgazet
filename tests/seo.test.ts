import { describe, expect, it } from "vitest";
import { getPublishedArticles } from "../apps/web/src/lib/content";
import {
  buildNewsArticleJsonLd,
  serializeJsonLd,
} from "../apps/web/src/lib/seo";
import { DEFAULT_OG_IMAGE } from "../apps/web/src/lib/site-config";

describe("NewsArticle structured data", () => {
  it("marks gated content with the paywall selector", async () => {
    const article = (await getPublishedArticles()).find(
      (item) => item.isGated,
    )!;
    const jsonLd = buildNewsArticleJsonLd(article);
    expect(jsonLd.isAccessibleForFree).toBe(false);
    expect(jsonLd).toMatchObject({
      hasPart: {
        cssSelector: ".paywall",
        isAccessibleForFree: false,
      },
    });
  });

  it("omits hasPart for free articles", async () => {
    const article = (await getPublishedArticles()).find(
      (item) => !item.isGated,
    )!;
    const jsonLd = buildNewsArticleJsonLd(article);
    expect(jsonLd.isAccessibleForFree).toBe(true);
    expect("hasPart" in jsonLd).toBe(false);
  });

  it("escapes less-than characters in inline JSON", () => {
    expect(serializeJsonLd({ value: "</script>" })).not.toContain("</script>");
  });

  it("exposes a default OG image fallback for typographic articles", () => {
    expect(DEFAULT_OG_IMAGE).toBe("https://devoetbalgazet.be/opengraph-image");
  });
});
