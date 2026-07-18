import type { Metadata } from "next";
import Link from "next/link";
import { TOP_SHARE_PROTOTYPES } from "@/components/share-prototypes/top-catalog";

export const metadata: Metadata = {
  title: "Top share prototypes · De Voetbalgazet",
  robots: { index: false, follow: false },
};

export default function TopSharePrototypesIndexPage() {
  return (
    <main className="share-proto">
      <header className="share-proto__header shell">
        <p className="eyebrow">Exploratie · na de hero</p>
        <h1>Compact delen — 5 richtingen</h1>
        <p className="dek">
          Voor vlak onder de afbeelding: minder ruimte dan de WhatsApp Hero
          onderaan. WhatsApp blijft primair.
        </p>
        <p className="share-proto__note">
          Footer-hero blijft:{" "}
          <Link href="/share-prototypes/whatsapp-hero">WhatsApp Hero</Link>
        </p>
      </header>
      <ol className="share-proto__list shell">
        {TOP_SHARE_PROTOTYPES.map((prototype) => (
          <li key={prototype.slug}>
            <Link href={`/share-prototypes/top/${prototype.slug}`}>
              <span className="share-proto__list-num">{prototype.number}</span>
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
