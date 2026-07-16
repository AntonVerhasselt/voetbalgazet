import type { MetadataRoute } from "next";
import { getPublishedArticles, SITE_URL } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE_URL}/archief`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/voorwaarden`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  return [
    ...staticPages,
    ...getPublishedArticles().map((article) => ({
      url: `${SITE_URL}/nieuws/${article.slug}`,
      lastModified: article.updatedAt ?? article.publishedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
