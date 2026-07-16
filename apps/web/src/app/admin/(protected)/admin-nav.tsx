"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavProps = {
  canEditArticles: boolean;
  isAdmin: boolean;
};

export function AdminNav({ canEditArticles, isAdmin }: AdminNavProps) {
  const pathname = usePathname();
  return (
    <nav className="admin-nav" aria-label="Redactienavigatie">
      <Link href="/admin" aria-current={pathname === "/admin" ? "page" : undefined}>
        Overzicht
      </Link>
      {canEditArticles ? (
        <Link
          href="/admin/artikels"
          aria-current={
            pathname.startsWith("/admin/artikels") ? "page" : undefined
          }
        >
          Artikels
        </Link>
      ) : (
        <span aria-disabled="true">Artikels</span>
      )}
      <span aria-disabled="true">Nieuwsbrieven · fase 4</span>
      <span aria-disabled="true">Abonnees · fase 4</span>
      {isAdmin ? <span aria-disabled="true">Instellingen · fase 4</span> : null}
    </nav>
  );
}
