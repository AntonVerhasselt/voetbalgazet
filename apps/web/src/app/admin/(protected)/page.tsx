import Link from "next/link";
import { getAdminSession } from "@/lib/admin-session";
import { getContentStatusSafe } from "@/lib/content";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string }>;
}) {
  const [status, session, query] = await Promise.all([
    getContentStatusSafe(),
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
          Schrijf artikels via Keystatic en verstuur de wekelijkse nieuwsbrief
          vanuit dezelfde redactieshell.
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
            {status
              ? `${status.drafts} concept${status.drafts === 1 ? "" : "en"} · ${status.published} gepubliceerd · ${status.archived} gearchiveerd`
              : "Artikelstatus tijdelijk niet beschikbaar"}
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
          <p className="eyebrow">Nieuwsbrief</p>
          <h2>Nieuwsbrieven</h2>
          <p>Concepten bewerken, publiek kiezen, testen en verzenden.</p>
          <Link className="admin-task-card__action" href="/admin/nieuwsbrieven">
            Open nieuwsbrieven <span aria-hidden="true">→</span>
          </Link>
        </article>
        <article className="admin-task-card">
          <p className="eyebrow">Publiek</p>
          <h2>Abonnees</h2>
          <p>Overzicht van nieuwsbrief- en sitetoegang (gemaskeerd).</p>
          <Link className="admin-task-card__action" href="/admin/abonnees">
            Bekijk abonnees <span aria-hidden="true">→</span>
          </Link>
        </article>
      </section>
    </>
  );
}
