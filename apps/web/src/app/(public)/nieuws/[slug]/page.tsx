import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleIllustration } from "@/components/article-illustration";
import { articles, getArticle } from "@/content/articles";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    return {};
  }

  return {
    title: article.headline,
    description: article.dek,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    notFound();
  }

  return (
    <main>
      <article className="article">
        <header className="article__header shell shell--article">
          <p className="eyebrow">
            {article.kicker} · {article.category}
          </p>
          <h1>{article.headline}</h1>
          <p className="dek">{article.dek}</p>
          <div className="article-meta">
            <span>Door {article.author}</span>
            <time dateTime={article.publishedAt}>12 juli 2026</time>
            <span>{article.readingTime}</span>
          </div>
        </header>

        <div className="shell shell--wide article__hero">
          <ArticleIllustration />
          <p className="article__caption">{article.heroAlt}</p>
        </div>

        <div className="shell shell--article article__body">
          {article.body.map((block, index) => {
            if (block.type === "heading") {
              return <h2 key={`${block.type}-${index}`}>{block.text}</h2>;
            }
            if (block.type === "quote") {
              return (
                <blockquote key={`${block.type}-${index}`}>
                  <p>“{block.text}”</p>
                  <cite>{block.attribution}</cite>
                </blockquote>
              );
            }
            return <p key={`${block.type}-${index}`}>{block.text}</p>;
          })}
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
