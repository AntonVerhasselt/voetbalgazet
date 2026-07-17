import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { getContentStatusSafe } from "@/lib/content";

export default async function ArticlesAdminPage() {
  const [session, status] = await Promise.all([
    getAdminSession(),
    getContentStatusSafe(),
  ]);
  if (!session || session.role === "viewer") {
    redirect("/admin?fout=onvoldoende-rechten");
  }

  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">Artikels</p>
        <h1>Schrijven in Keystatic</h1>
        <p>
          Keystatic opent als volledige editor. Je GitHub-toegang bepaalt of je
          bestanden en beelden in de repository kunt bewaren.
        </p>
      </header>
      <section className="admin-editor-launch">
        <div>
          <span>Concepten</span>
          <strong>{status?.drafts ?? "—"}</strong>
        </div>
        <div>
          <span>Gepubliceerd</span>
          <strong>{status?.published ?? "—"}</strong>
        </div>
        <div>
          <span>Gearchiveerd</span>
          <strong>{status?.archived ?? "—"}</strong>
        </div>
        <Link className="admin-editor-launch__button" href="/keystatic">
          Keystatic openen <span aria-hidden="true">→</span>
        </Link>
      </section>
      <aside className="admin-notice">
        <strong>Publicatieflow</strong>
        <p>
          Opslaan maakt een Git-commit. Alleen status Gepubliceerd met een
          publicatiedatum verschijnt na een geslaagde Vercel-build op de site.
        </p>
      </aside>
    </>
  );
}
