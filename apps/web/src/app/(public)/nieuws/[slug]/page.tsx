import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies, draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { ArticleAccessGate } from "@/components/article-access-gate";
import { ArticleAnalytics } from "@/components/article-analytics";
import { ArticleBlocks } from "@/components/article-blocks";
import { ArticleIllustration } from "@/components/article-illustration";
import { PreviewArticleGate } from "@/components/preview-article-gate";
import { PreviewFrame } from "@/components/preview-frame";
import { getEditorSession } from "@/lib/admin-session";
import {
  formatArticleDate,
  getArticle,
  getPublishedArticles,
  splitArticle,
} from "@/lib/content";
import {
  PREVIEW_COOKIE,
  verifyPreviewToken,
} from "@/lib/preview-session";
import {
  articleUrl,
  buildNewsArticleJsonLd,
  serializeJsonLd,
} from "@/lib/seo";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gate?: string }>;
};

type ActivePreview = {
  branch: string;
};

export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPublishedArticles()).map((article) => ({
    slug: article.slug,
  }));
}

async function activePreview(slug: string): Promise<ActivePreview | null> {
  const draft = await draftMode();
  if (!draft.isEnabled) {
    return null;
  }
  const session = await getEditorSession();
  if (!session) {
    return null;
  }
  const token = (await cookies()).get(PREVIEW_COOKIE)?.value;
  const preview = token ? verifyPreviewToken(token) : null;
  if (!preview || new URL(preview.target, "https://preview.local").pathname !== `/nieuws/${slug}`) {
    return null;
  }
  return { branch: preview.branch };
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const preview = await activePreview(slug);
  const article = await getArticle(slug, preview?.branch);

  if (
    !article ||
    (!preview && (article.status !== "published" || !article.publishedAt))
  ) {
    return {};
  }

  if (preview) {
    return {
      title: `[Preview] ${article.headline}`,
      description: article.dek,
      robots: { index: false, follow: false, nocache: true },
    };
  }

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
      publishedTime: article.publishedAt!,
      modifiedTime: article.updatedAt ?? article.publishedAt!,
      authors: [article.author],
      section: article.category,
      images: article.socialImage ?? article.heroImage ?? undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle || article.headline,
      description: article.seoDescription || article.dek,
      images: article.socialImage ?? article.heroImage ?? undefined,
    },
  };
}

export default async function ArticlePage({
  params,
  searchParams,
}: ArticlePageProps) {
  const { slug } = await params;
  const { gate } = await searchParams;
  const preview = await activePreview(slug);
  const article = await getArticle(slug, preview?.branch);

  if (
    !article ||
    (!preview && (article.status !== "published" || !article.publishedAt))
  ) {
    notFound();
  }

  const sections = splitArticle(article);
  const publishedAt = article.publishedAt;
  const gateMode = gate === "ungated" ? "ungated" : "gated";
  const jsonLd =
    article.status === "published" && publishedAt
      ? buildNewsArticleJsonLd({ ...article, publishedAt })
      : null;

  const page = (
    <main>
      {!preview ? (
        <ArticleAnalytics
          articleId={article.slug}
          category={article.categoryKey}
          division={article.divisionKeys[0] ?? "general"}
          isGated={article.isGated}
        />
      ) : null}
      {jsonLd && !preview ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      ) : null}
      <article className="article">
        <header className="article__header shell shell--article">
          <p className="eyebrow">
            {article.kicker || "Verhaal"} · {article.category}
          </p>
          <h1>{article.headline}</h1>
          <p className="dek">{article.dek}</p>
          <div className="article-meta">
            <span>Door {article.author}</span>
            {publishedAt ? (
              <time dateTime={publishedAt}>
                {formatArticleDate(publishedAt)}
              </time>
            ) : (
              <span>Concept · nog niet gepubliceerd</span>
            )}
            <span>{article.readingTime}</span>
          </div>
        </header>

        <div className="shell shell--wide article__hero">
          {article.heroImage ? (
            <figure className="article-photo">
              <Image
                src={article.heroImage}
                alt={article.heroAlt}
                width={1600}
                height={900}
                sizes="(max-width: 900px) 100vw, 1200px"
                priority
              />
              {article.heroCredit ? (
                <figcaption>{article.heroCredit}</figcaption>
              ) : null}
            </figure>
          ) : (
            <>
              <ArticleIllustration
                tone={article.illustrationTone}
                eyebrow={article.category}
                title={article.homeTeam || article.kicker || "Lokaal"}
                subtitle={
                  article.awayTeam ||
                  article.competitionLabel ||
                  article.divisionKeys[0]?.replaceAll("-", " ") ||
                  "voetbal"
                }
                alt={article.heroAlt}
              />
              <p className="article__caption">{article.heroAlt}</p>
            </>
          )}
        </div>

        <div className="shell shell--article article__body">
          {preview && article.isGated && gateMode === "gated" ? (
            <PreviewArticleGate
              lead={<ArticleBlocks blocks={sections.lead} />}
            >
              <ArticleBlocks blocks={sections.gated} />
            </PreviewArticleGate>
          ) : article.isGated && !preview ? (
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
            <ArticleBlocks blocks={article.body.children} />
          )}
        </div>

        <footer className="shell shell--article article__footer">
          <p>
            {preview ? "Conceptpreview" : `Gepubliceerd in ${article.category}`}
          </p>
          <Link className="text-link" href="/#inschrijven">
            Ontvang verhalen uit jouw reeks <span aria-hidden="true">→</span>
          </Link>
        </footer>
      </article>
    </main>
  );

  return preview ? (
    <PreviewFrame
      articlePath={`/nieuws/${article.slug}`}
      gateMode={gateMode}
    >
      {page}
    </PreviewFrame>
  ) : (
    page
  );
}
