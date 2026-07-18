import type { Metadata } from "next";
import Link from "next/link";
import { SHARE_PROTOTYPES } from "@/components/share-prototypes/catalog";

export const metadata: Metadata = {
  title: "Share prototypes · De Voetbalgazet",
  robots: { index: false, follow: false },
};

export default function SharePrototypesIndexPage() {
  return (
    <main className="share-proto">
      <header className="share-proto__header shell">
        <p className="eyebrow">Exploratie</p>
        <h1>Artikel delen — 5 richtingen</h1>
        <p className="dek">
          WhatsApp eerst, daarna Facebook, X, Messenger, e-mail en kopieerlink.
          Kies een variant om hem in artikelcontext te zien.
        </p>
        <p className="share-proto__note">
          Compacte top-varianten (na de hero):{" "}
          <Link href="/share-prototypes/top">5 ideeën →</Link>
        </p>
      </header>
      <ol className="share-proto__list shell">
        {SHARE_PROTOTYPES.map((prototype) => (
          <li key={prototype.slug}>
            <Link href={`/share-prototypes/${prototype.slug}`}>
              <span className="share-proto__list-num">
                {prototype.number}
              </span>
              <span>
                <strong>{prototype.title}</strong>
                <em>{prototype.summary}</em>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
