import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePageContent } from "@/components/article-page-content";
import { getArticle, getPublishedArticles } from "@/lib/content";
import { articleUrl } from "@/lib/seo";
import { DEFAULT_OG_IMAGE } from "@/lib/site-config";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPublishedArticles()).map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (
    !article ||
    article.status !== "published" ||
    !article.publishedAt
  ) {
    return {};
  }
  const image =
    article.socialImage ?? article.heroImage ?? DEFAULT_OG_IMAGE;
  return {
    title: article.seoTitle || article.headline,
    description: article.seoDescription || article.dek,
    alternates: {
      canonical: article.canonicalOverride || articleUrl(article),
    },
    openGraph: {
      type: "article",
      url: articleUrl(article),
      title: article.seoTitle || article.headline,
      description: article.seoDescription || article.dek,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: [article.author],
      section: article.category,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle || article.headline,
      description: article.seoDescription || article.dek,
      images: [image],
    },
    robots: article.excludeFromSearch
      ? {
          index: false,
          follow: true,
        }
      : undefined,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (
    !article ||
    article.status !== "published" ||
    !article.publishedAt
  ) {
    notFound();
  }
  return <ArticlePageContent article={article} />;
}
