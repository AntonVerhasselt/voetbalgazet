"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavProps = {
  canEditArticles: boolean;
  isAdmin: boolean;
};

function NavLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active =
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
    >
      {children}
    </Link>
  );
}

function NavLabel({
  full,
  short,
}: {
  full: string;
  short: string;
}) {
  return (
    <>
      <span className="admin-nav__full">{full}</span>
      <span className="admin-nav__short" aria-hidden="true">
        {short}
      </span>
    </>
  );
}

export function AdminNav({ canEditArticles, isAdmin }: AdminNavProps) {
  return (
    <nav className="admin-nav" aria-label="Redactienavigatie">
      <NavLink href="/admin" label="Overzicht">
        <NavLabel full="Overzicht" short="Home" />
      </NavLink>
      {canEditArticles ? (
        <NavLink href="/admin/artikels" label="Artikels">
          <NavLabel full="Artikels" short="Artikels" />
        </NavLink>
      ) : (
        <span aria-disabled="true" title="Artikels">
          <NavLabel full="Artikels" short="Artikels" />
        </span>
      )}
      <NavLink href="/admin/nieuwsbrieven" label="Nieuwsbrieven">
        <NavLabel full="Nieuwsbrieven" short="Brieven" />
      </NavLink>
      <NavLink href="/admin/abonnees" label="Abonnees">
        <NavLabel full="Abonnees" short="Abonnees" />
      </NavLink>
      {canEditArticles ? (
        <NavLink href="/admin/email/dienstmails" label="Dienstmails">
          <NavLabel full="Dienstmails" short="Mails" />
        </NavLink>
      ) : null}
      {isAdmin ? (
        <NavLink href="/admin/email/instellingen" label="Instellingen">
          <NavLabel full="Instellingen" short="Instel." />
        </NavLink>
      ) : null}
    </nav>
  );
}
