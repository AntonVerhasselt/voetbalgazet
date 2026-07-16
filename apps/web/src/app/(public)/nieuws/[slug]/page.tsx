import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleAccessGate } from "@/components/article-access-gate";
import { ArticleAnalytics } from "@/components/article-analytics";
import { ArticleBlocks } from "@/components/article-blocks";
import { ArticleIllustration } from "@/components/article-illustration";
import { getArticle } from "@/content/articles";
import {
  formatArticleDate,
  getPublishedArticles,
  splitArticle,
} from "@/lib/content";
import {
  articleUrl,
  buildNewsArticleJsonLd,
  serializeJsonLd,
} from "@/lib/seo";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article || article.status !== "published") {
    return {};
  }

  return {
    title: article.headline,
    description: article.dek,
    alternates: {
      canonical: articleUrl(article),
    },
    openGraph: {
      type: "article",
      url: articleUrl(article),
      title: article.headline,
      description: article.dek,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: [article.author],
      section: article.category,
    },
    twitter: {
      card: "summary_large_image",
      title: article.headline,
      description: article.dek,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article || article.status !== "published") {
    notFound();
  }
  const sections = splitArticle(article);
  const jsonLd = buildNewsArticleJsonLd(article);

  return (
    <main>
      <ArticleAnalytics
        articleId={article.slug}
        category={article.categoryKey}
        division={article.divisionKeys[0] ?? "general"}
        isGated={article.isGated}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <article className="article">
        <header className="article__header shell shell--article">
          <p className="eyebrow">
            {article.kicker} · {article.category}
          </p>
          <h1>{article.headline}</h1>
          <p className="dek">{article.dek}</p>
          <div className="article-meta">
            <span>Door {article.author}</span>
            <time dateTime={article.publishedAt}>
              {formatArticleDate(article.publishedAt)}
            </time>
            <span>{article.readingTime}</span>
          </div>
        </header>

        <div className="shell shell--wide article__hero">
          <ArticleIllustration
            tone={article.illustrationTone}
            eyebrow={article.category}
            title={article.kicker.split("·")[0]?.trim() ?? "Lokaal"}
            subtitle={article.divisionKeys[0]?.replaceAll("-", " ") ?? "voetbal"}
            alt={article.heroAlt}
          />
          <p className="article__caption">{article.heroAlt}</p>
        </div>

        <div className="shell shell--article article__body">
          {article.isGated ? (
            <ArticleAccessGate
              articleId={article.slug}
              leadLength={article.leadParagraphCount}
              preview={<ArticleBlocks blocks={sections.lead} />}
            >
              <div className="paywall" data-nosnippet>
                <ArticleBlocks blocks={sections.gated} />
              </div>
            </ArticleAccessGate>
          ) : (
            <ArticleBlocks blocks={article.body} />
          )}
        </div>

        <footer className="shell shell--article article__footer">
          <p>Gepubliceerd in {article.category}</p>
          <Link className="text-link" href="/#inschrijven">
            Ontvang verhalen uit jouw reeks <span aria-hidden="true">→</span>
          </Link>
        </footer>
      </article>
    </main>
  );
}
