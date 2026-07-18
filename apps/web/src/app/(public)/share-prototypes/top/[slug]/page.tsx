import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTopSharePrototype,
  TOP_SHARE_PROTOTYPES,
  type TopSharePrototypeSlug,
} from "@/components/share-prototypes/top-catalog";

export const metadata: Metadata = {
  title: "Top share prototypes · De Voetbalgazet",
  robots: { index: false, follow: false },
};

const DEMO = {
  articleId: "zondagen-langs-de-lijn",
  headline: "Zondagen langs de lijn",
};

export default async function TopSharePrototypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prototype = getTopSharePrototype(slug);
  if (!prototype) {
    notFound();
  }

  const Share = prototype.Component;

  return (
    <main className="share-proto">
      <header className="share-proto__header shell">
        <p className="eyebrow">Top · prototype {prototype.number} / 5</p>
        <h1>{prototype.title}</h1>
        <p className="dek">{prototype.summary}</p>
        <nav className="share-proto__nav" aria-label="Andere top-prototypes">
          {TOP_SHARE_PROTOTYPES.map((item) => (
            <Link
              key={item.slug}
              href={`/share-prototypes/top/${item.slug}`}
              className={
                item.slug === slug
                  ? "share-proto__nav-link is-active"
                  : "share-proto__nav-link"
              }
              aria-current={item.slug === slug ? "page" : undefined}
            >
              {item.number}. {item.title}
            </Link>
          ))}
        </nav>
        <p className="share-proto__note">
          Compacte plaatsing vlak onder de hero.{" "}
          <Link href="/share-prototypes/top">Alle top-ideeën</Link>
        </p>
      </header>

      <div className="share-proto__stage shell shell--article">
        <article
          className="share-proto__article top-share-stage"
          data-top-share-stage={slug}
        >
          <header className="top-share-stage__header">
            <p className="eyebrow">Verhaal · Clubnieuws</p>
            <h2>Zondagen langs de lijn</h2>
            <p className="dek">
              Waarom de beste gesprekken vaak na het fluitsignaal beginnen.
            </p>
          </header>

          <div className="top-share-stage__hero" aria-hidden="true">
            <div className="top-share-stage__hero-art">
              <span>Hero</span>
            </div>
            <p className="top-share-stage__credit">Illustratie · redactie</p>
          </div>

          <Share articleId={DEMO.articleId} headline={DEMO.headline} />

          <div className="top-share-stage__body">
            <p>
              De eerste alinea van het verhaal begint hier — de share-balk
              hierboven moet licht blijven, zodat het lezen niet stopt.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}

export function generateStaticParams(): Array<{ slug: TopSharePrototypeSlug }> {
  return TOP_SHARE_PROTOTYPES.map((prototype) => ({ slug: prototype.slug }));
}
