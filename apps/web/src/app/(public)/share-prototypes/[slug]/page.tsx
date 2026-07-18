import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSharePrototype,
  SHARE_PROTOTYPES,
  type SharePrototypeSlug,
} from "@/components/share-prototypes/catalog";

export const metadata: Metadata = {
  title: "Share prototypes · De Voetbalgazet",
  robots: { index: false, follow: false },
};

const DEMO = {
  articleId: "zondagen-langs-de-lijn",
  headline: "Zondagen langs de lijn",
};

export default async function SharePrototypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prototype = getSharePrototype(slug);
  if (!prototype) {
    notFound();
  }

  const Share = prototype.Component;

  return (
    <main className="share-proto">
      <header className="share-proto__header shell">
        <p className="eyebrow">Prototype {prototype.number} / 5</p>
        <h1>{prototype.title}</h1>
        <p className="dek">{prototype.summary}</p>
        <nav className="share-proto__nav" aria-label="Andere prototypes">
          {SHARE_PROTOTYPES.map((item) => (
            <Link
              key={item.slug}
              href={`/share-prototypes/${item.slug}`}
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
          Alleen ter vergelijking — niet live op artikelpagina&apos;s.{" "}
          <Link href="/nieuws/zondagen-langs-de-lijn">Bekijk een echt artikel</Link>
        </p>
      </header>

      <div className="share-proto__stage shell shell--article">
        <article className="share-proto__article" data-share-stage={slug}>
          <p className="share-proto__meta">Gepubliceerd in Zondag</p>
          <Share articleId={DEMO.articleId} headline={DEMO.headline} />
          <p className="share-proto__cta">
            Ontvang verhalen uit jouw reeks <span aria-hidden="true">→</span>
          </p>
        </article>
      </div>
    </main>
  );
}

export function generateStaticParams(): Array<{ slug: SharePrototypeSlug }> {
  return SHARE_PROTOTYPES.map((prototype) => ({ slug: prototype.slug }));
}
