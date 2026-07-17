import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/content/articles";
import { ArticleAccessGate } from "@/components/article-access-gate";
import { ArticleAnalytics } from "@/components/article-analytics";
import { ArticleBlocks } from "@/components/article-blocks";
import { ArticleIllustration } from "@/components/article-illustration";
import { ArticleShareControls } from "@/components/article-share-controls";
import { PreviewArticleGate } from "@/components/preview-article-gate";
import { getIllustrationCopy } from "@/lib/article-illustration";
import { formatArticleDate, splitArticle } from "@/lib/content";
import {
  buildNewsArticleJsonLd,
  serializeJsonLd,
} from "@/lib/seo";

export function ArticlePageContent({
  article,
  previewGateMode,
}: {
  article: Article;
  previewGateMode?: "gated" | "ungated";
}) {
  const isPreview = previewGateMode !== undefined;
  const sections = splitArticle(article);
  const illustration = getIllustrationCopy(article);
  const publishedAt = article.publishedAt;
  const jsonLd =
    article.status === "published" && publishedAt
      ? buildNewsArticleJsonLd({
          ...article,
          status: "published",
          publishedAt,
        })
      : null;

  return (
    <main>
      {!isPreview ? (
        <ArticleAnalytics
          articleId={article.slug}
          category={article.categoryKey}
          division={article.divisionKeys[0] ?? "general"}
          isGated={article.isGated}
        />
      ) : null}
      {jsonLd && !isPreview ? (
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
          {!isPreview ? (
            <ArticleShareControls
              articleId={article.slug}
              headline={article.headline}
            />
          ) : null}
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
                eyebrow={illustration.eyebrow}
                title={illustration.title}
                subtitle={illustration.subtitle}
                alt={article.heroAlt}
              />
              <p className="article__caption">{article.heroAlt}</p>
            </>
          )}
        </div>

        <div className="shell shell--article article__body" data-article-body>
          {!isPreview ? (
            <>
              <span
                className="article-lead-sentinel"
                data-article-lead
                aria-hidden="true"
              />
              {[25, 50, 75].map((depth) => (
                <span
                  className={`article-read-marker article-read-marker--${depth}`}
                  data-read-depth={depth}
                  aria-hidden="true"
                  key={depth}
                />
              ))}
            </>
          ) : null}
          {isPreview &&
          article.isGated &&
          previewGateMode === "gated" ? (
            <PreviewArticleGate
              lead={<ArticleBlocks blocks={sections.lead} />}
            >
              <ArticleBlocks blocks={sections.gated} />
            </PreviewArticleGate>
          ) : article.isGated && !isPreview ? (
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
            {isPreview
              ? "Conceptpreview"
              : `Gepubliceerd in ${article.category}`}
          </p>
          <Link className="text-link" href="/#inschrijven">
            Ontvang verhalen uit jouw reeks <span aria-hidden="true">→</span>
          </Link>
        </footer>
      </article>
    </main>
  );
}
