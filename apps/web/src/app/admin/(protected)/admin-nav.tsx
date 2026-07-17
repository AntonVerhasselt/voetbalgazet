"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavProps = {
  canEditArticles: boolean;
  isAdmin: boolean;
};

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active =
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

export function AdminNav({ canEditArticles, isAdmin }: AdminNavProps) {
  return (
    <nav className="admin-nav" aria-label="Redactienavigatie">
      <NavLink href="/admin">Overzicht</NavLink>
      {canEditArticles ? (
        <NavLink href="/admin/artikels">Artikels</NavLink>
      ) : (
        <span aria-disabled="true">Artikels</span>
      )}
      <NavLink href="/admin/nieuwsbrieven">Nieuwsbrieven</NavLink>
      <NavLink href="/admin/abonnees">Abonnees</NavLink>
      {canEditArticles ? (
        <NavLink href="/admin/email/dienstmails">Dienstmails</NavLink>
      ) : null}
      {isAdmin ? (
        <NavLink href="/admin/email/instellingen">Instellingen</NavLink>
      ) : null}
    </nav>
  );
}
