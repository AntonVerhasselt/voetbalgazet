import Link from "next/link";
import { getAdminSession } from "@/lib/admin-session";
import { getContentStatus } from "@/lib/content";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string }>;
}) {
  const [status, session, query] = await Promise.all([
    getContentStatus(),
    getAdminSession(),
    searchParams,
  ]);
  const canEditArticles = session?.role !== "viewer";

  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">Overzicht</p>
        <h1>Redactieomgeving</h1>
        <p>
          Schrijf en publiceer artikels via Keystatic. Git bewaart elke
          wijziging; een geslaagde Vercel-build zet gepubliceerd werk live.
        </p>
      </header>

      {query.fout === "onvoldoende-rechten" ? (
        <p className="admin-error" role="alert">
          Je viewerrol geeft geen toegang tot artikelbewerking.
        </p>
      ) : null}

      <section className="admin-task-grid" aria-label="Primaire redactietaken">
        <article className="admin-task-card admin-task-card--primary">
          <p className="eyebrow">Content</p>
          <h2>Artikels schrijven</h2>
          <p>
            {status.drafts} concept{status.drafts === 1 ? "" : "en"} ·{" "}
            {status.published} gepubliceerd · {status.archived} gearchiveerd
          </p>
          {canEditArticles ? (
            <Link className="admin-task-card__action" href="/admin/artikels">
              Open artikelbeheer <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <span className="admin-task-card__disabled">Alleen-lezen rol</span>
          )}
        </article>
        <article className="admin-task-card">
          <p className="eyebrow">Fase 4</p>
          <h2>Nieuwsbrieven</h2>
          <p>De editor, doelgroepen en verzending volgen in de volgende fase.</p>
          <span className="admin-task-card__disabled">Nog niet actief</span>
        </article>
        <article className="admin-task-card">
          <p className="eyebrow">Fase 4</p>
          <h2>Abonnees</h2>
          <p>Subscriberbeheer blijft afgeschermd tot de nieuwsbriefadmin klaar is.</p>
          <span className="admin-task-card__disabled">Nog niet actief</span>
        </article>
      </section>
    </>
  );
}
