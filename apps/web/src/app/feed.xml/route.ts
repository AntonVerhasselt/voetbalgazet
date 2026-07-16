import {
  excerptArticle,
  getPublishedArticles,
  SITE_URL,
} from "@/lib/content";

export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function GET() {
  const items = getPublishedArticles()
    .map((article) => {
      const url = `${SITE_URL}/nieuws/${article.slug}`;
      const excerpt = `${excerptArticle(article)} Lees verder op De Voetbalgazet.`;
      return [
        "<item>",
        `<title>${escapeXml(article.headline)}</title>`,
        `<link>${url}</link>`,
        `<guid isPermaLink="true">${url}</guid>`,
        `<pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>`,
        `<dc:creator>${escapeXml(article.author)}</dc:creator>`,
        `<category>${escapeXml(article.category)}</category>`,
        `<description>${escapeXml(excerpt)}</description>`,
        "</item>",
      ].join("");
    })
    .join("");

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">' +
    "<channel>" +
    "<title>De Voetbalgazet</title>" +
    `<link>${SITE_URL}</link>` +
    "<description>Lokaal voetbal, echte verhalen.</description>" +
    "<language>nl-BE</language>" +
    `<lastBuildDate>${new Date(
      getPublishedArticles()[0]?.publishedAt ?? "2026-07-16T00:00:00.000Z",
    ).toUTCString()}</lastBuildDate>` +
    items +
    "</channel></rss>";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
