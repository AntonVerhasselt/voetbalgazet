import Link from "next/link";
import { ArticleIllustration } from "@/components/article-illustration";
import { SignupForm } from "@/components/signup-form";
import { formatArticleDate, getPublishedArticles } from "@/lib/content";

export default async function Home() {
  const publishedArticles = await getPublishedArticles();
  const featuredArticle =
    publishedArticles.find((article) => article.featured) ??
    publishedArticles[0];
  if (!featuredArticle) {
    return null;
  }
  const secondaryArticles = publishedArticles
    .filter((article) => article.slug !== featuredArticle.slug)
    .slice(0, 3);

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
              eyebrow={featuredArticle.category}
              title="Zondag"
              subtitle="langs de lijn"
              alt={featuredArticle.heroAlt}
            />
          </Link>
        </article>

        <div className="home-lead__secondary" aria-label="Meer verhalen">
          {secondaryArticles.map((article) => (
            <article className="home-lead__story" key={article.slug}>
              <p className="eyebrow">{article.kicker}</p>
              <Link
                className="home-lead__story-link"
                href={`/nieuws/${article.slug}`}
              >
                <h2>{article.headline}</h2>
              </Link>
            </article>
          ))}
        </div>
        <Link className="home-lead__archive" href="/archief">
          Volledig archief <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section
        className="signup-band"
        id="inschrijven"
        aria-labelledby="signup-heading"
      >
        <div className="shell signup-band__inner">
          <div>
            <p className="eyebrow">Blijf langs de lijn</p>
            <h2 id="signup-heading">Verhalen uit jouw reeks, in je mailbox.</h2>
            <p>
              Kies minstens één reeks en optioneel je favoriete club. Je krijgt
              meteen toegang tot alle verhalen en onze wekelijkse nieuwsbrief.
            </p>
          </div>
          <SignupForm source="homepage_inline" />
        </div>
      </section>
    </main>
  );
}
