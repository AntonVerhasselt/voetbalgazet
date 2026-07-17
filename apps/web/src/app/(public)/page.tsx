import Link from "next/link";
import type { Metadata } from "next";
import { ArticleIllustration } from "@/components/article-illustration";
import { HomepageSignupBand } from "@/components/homepage-signup-band";
import { getIllustrationCopy } from "@/lib/article-illustration";
import { formatArticleDate, getPublishedArticles } from "@/lib/content";
import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/site-config";
import type { PublishedArticle } from "@/content/articles";

function StoryRow({ article }: { article: PublishedArticle }) {
  return (
    <article className="story-row">
      <div>
        <p className="eyebrow">{article.category}</p>
        <h3>
          <Link href={`/nieuws/${article.slug}`}>{article.headline}</Link>
        </h3>
      </div>
      <div>
        <p>{article.dek}</p>
        <span className="story-row__meta">
          {formatArticleDate(article.publishedAt)} · {article.readingTime}
        </span>
      </div>
    </article>
  );
}

function groupByCategory(
  articles: readonly PublishedArticle[],
): Array<{ category: string; articles: PublishedArticle[] }> {
  const groups = new Map<string, PublishedArticle[]>();
  for (const article of articles) {
    const group = groups.get(article.category) ?? [];
    group.push(article);
    groups.set(article.category, group);
  }
  return [...groups.entries()].map(([category, group]) => ({
    category,
    articles: group,
  }));
}

function categoryHeadingId(category: string): string {
  return `category-${category
    .toLocaleLowerCase("nl-BE")
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "")}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const publishedArticles = await getPublishedArticles();
  const featuredArticle =
    publishedArticles.find((article) => article.featured) ??
    publishedArticles[0];
  if (!featuredArticle) {
    return {};
  }
  const image =
    featuredArticle.socialImage ??
    featuredArticle.heroImage ??
    DEFAULT_OG_IMAGE;
  return {
    openGraph: {
      type: "website",
      url: SITE_URL,
      title: featuredArticle.seoTitle || featuredArticle.headline,
      description: featuredArticle.seoDescription || featuredArticle.dek,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: featuredArticle.seoTitle || featuredArticle.headline,
      description: featuredArticle.seoDescription || featuredArticle.dek,
      images: [image],
    },
  };
}

export default async function Home() {
  const publishedArticles = await getPublishedArticles();
  const featuredArticle =
    publishedArticles.find((article) => article.featured) ??
    publishedArticles[0];
  if (!featuredArticle) {
    return null;
  }
  const latestArticles = publishedArticles
    .filter((article) => article.slug !== featuredArticle.slug)
    .slice(0, 5);
  const categorySections = groupByCategory(
    publishedArticles.filter((article) => article.slug !== featuredArticle.slug),
  )
    .filter((section) => section.articles.length > 0)
    .slice(0, 4);
  const illustration = getIllustrationCopy(featuredArticle);

  return (
    <main>
      <section className="shell home-lead" aria-labelledby="hero-heading">
        <article className="home-lead__main">
          <div className="home-lead__copy">
            <p className="eyebrow">{featuredArticle.kicker}</p>
            <h1 id="hero-heading">
              <Link href={`/nieuws/${featuredArticle.slug}`}>
                {featuredArticle.headline}
              </Link>
            </h1>
            <Link
              className="home-lead__description"
              href={`/nieuws/${featuredArticle.slug}`}
            >
              {featuredArticle.dek}
            </Link>
            <div className="article-meta">
              <span>{featuredArticle.author}</span>
              <span>{formatArticleDate(featuredArticle.publishedAt)}</span>
              <span>{featuredArticle.readingTime}</span>
            </div>
          </div>
          <Link
            className="home-lead__image"
            href={`/nieuws/${featuredArticle.slug}`}
            aria-label={featuredArticle.headline}
          >
            <ArticleIllustration
              tone={featuredArticle.illustrationTone}
              eyebrow={illustration.eyebrow}
              title={illustration.title}
              subtitle={illustration.subtitle}
              alt={featuredArticle.heroAlt}
            />
          </Link>
        </article>

        <Link className="home-lead__archive" href="/archief">
          Volledig archief <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="shell latest" aria-labelledby="latest-heading">
        <div className="section-heading">
          <h2 id="latest-heading">Het laatste</h2>
          <p>Recent verschenen, zonder het hoofdverhaal</p>
        </div>
        {latestArticles.map((article) => (
          <StoryRow key={article.slug} article={article} />
        ))}
        <Link className="text-link latest__archive-link" href="/archief">
          Zoek in het archief <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="home-sections" aria-label="Verhalen per categorie">
        {categorySections.map((section) => {
          const headingId = categoryHeadingId(section.category);
          return (
            <section
              className="shell home-category"
              key={section.category}
              aria-labelledby={headingId}
            >
              <div className="section-heading">
                <h2 id={headingId}>{section.category}</h2>
                <p>Eén rubriek, één ritme</p>
              </div>
              {section.articles.slice(0, 3).map((article) => (
                <StoryRow key={article.slug} article={article} />
              ))}
            </section>
          );
        })}
      </section>

      <HomepageSignupBand />
    </main>
  );
}
