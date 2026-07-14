import Link from "next/link";
import { ArticleIllustration } from "@/components/article-illustration";
import { SignupForm } from "@/components/signup-form";
import { articles } from "@/content/articles";

export default function Home() {
  const featuredArticle = articles[0];

  return (
    <main>
      <section className="shell hero" aria-labelledby="hero-heading">
        <div className="hero__copy">
          <p className="eyebrow">{featuredArticle.kicker}</p>
          <h1 id="hero-heading">{featuredArticle.headline}</h1>
          <p className="dek">{featuredArticle.dek}</p>
          <div className="article-meta">
            <span>{featuredArticle.author}</span>
            <span>12 juli 2026</span>
            <span>{featuredArticle.readingTime}</span>
          </div>
          <Link
            className="text-link"
            href={`/nieuws/${featuredArticle.slug}`}
          >
            Lees het verhaal <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ArticleIllustration />
      </section>

      <section className="shell latest" aria-labelledby="latest-heading">
        <div className="section-heading">
          <p>De redactie selecteert</p>
          <h2 id="latest-heading">Het laatste</h2>
        </div>
        <article className="story-row">
          <ArticleIllustration compact />
          <div>
            <p className="eyebrow">{featuredArticle.category}</p>
            <h3>
              <Link href={`/nieuws/${featuredArticle.slug}`}>
                {featuredArticle.headline}
              </Link>
            </h3>
            <p>{featuredArticle.dek}</p>
            <span className="story-row__meta">
              12 juli 2026 · {featuredArticle.readingTime}
            </span>
          </div>
        </article>
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
              Start met je e-mailadres. Bij de opening kies je minstens één
              reeks en optioneel je favoriete club.
            </p>
          </div>
          <SignupForm />
        </div>
      </section>
    </main>
  );
}
