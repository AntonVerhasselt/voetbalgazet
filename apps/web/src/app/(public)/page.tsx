import Link from "next/link";
import { ArticleIllustration } from "@/components/article-illustration";
import { SignupForm } from "@/components/signup-form";
import { formatArticleDate, getPublishedArticles } from "@/lib/content";

export default function Home() {
  const publishedArticles = getPublishedArticles();
  const featuredArticle =
    publishedArticles.find((article) => article.featured) ??
    publishedArticles[0];
  if (!featuredArticle) {
    return null;
  }
  const latestArticles = publishedArticles.filter(
    (article) => article.slug !== featuredArticle.slug,
  );

  return (
    <main>
      <section className="shell hero" aria-labelledby="hero-heading">
        <div className="hero__copy">
          <p className="eyebrow">{featuredArticle.kicker}</p>
          <h1 id="hero-heading">{featuredArticle.headline}</h1>
          <p className="dek">{featuredArticle.dek}</p>
          <div className="article-meta">
            <span>{featuredArticle.author}</span>
            <span>{formatArticleDate(featuredArticle.publishedAt)}</span>
            <span>{featuredArticle.readingTime}</span>
          </div>
          <Link
            className="text-link"
            href={`/nieuws/${featuredArticle.slug}`}
          >
            Lees het verhaal <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ArticleIllustration
          tone={featuredArticle.illustrationTone}
          eyebrow={featuredArticle.category}
          title="Zondag"
          subtitle="langs de lijn"
          alt={featuredArticle.heroAlt}
        />
      </section>

      <section className="shell latest" aria-labelledby="latest-heading">
        <div className="section-heading">
          <p>De redactie selecteert</p>
          <h2 id="latest-heading">Het laatste</h2>
        </div>
        <div className="latest__list">
          {latestArticles.map((article) => (
            <article className="story-row" key={article.slug}>
              <ArticleIllustration
                compact
                tone={article.illustrationTone}
                eyebrow={article.category}
                title={article.kicker.split("·")[0]?.trim() ?? "Lokaal"}
                subtitle={article.divisionKeys[0]?.replaceAll("-", " ") ?? ""}
                alt={article.heroAlt}
              />
              <div>
                <p className="eyebrow">{article.category}</p>
                <h3>
                  <Link href={`/nieuws/${article.slug}`}>
                    {article.headline}
                  </Link>
                </h3>
                <p>{article.dek}</p>
                <span className="story-row__meta">
                  {formatArticleDate(article.publishedAt)} ·{" "}
                  {article.readingTime}
                </span>
              </div>
            </article>
          ))}
        </div>
        <Link className="text-link latest__archive-link" href="/archief">
          Bekijk het volledige archief <span aria-hidden="true">→</span>
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
