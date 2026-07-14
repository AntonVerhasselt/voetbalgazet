import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@convex/_generated/api";
import {
  fetchAuthQuery,
  isAuthBackendConfigured,
} from "@/lib/auth-server";
import { SignOutButton } from "./sign-out-button";

const roleLabels = {
  admin: "Beheerder",
  journalist: "Journalist",
  viewer: "Lezer",
} as const;

async function getAdminSession() {
  if (!isAuthBackendConfigured()) {
    return null;
  }

  try {
    return await fetchAuthQuery(api.admin.getSession, {});
  } catch {
    return null;
  }
}

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/inloggen");
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link className="admin-wordmark" href="/admin">
          De Voetbalgazet
        </Link>
        <div className="admin-header__account">
          <span>{roleLabels[session.role]}</span>
          <span>{session.email}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="admin-shell__body">
        <nav className="admin-nav" aria-label="Redactienavigatie">
          <Link href="/admin" aria-current="page">
            Overzicht
          </Link>
          <span aria-disabled="true">Artikels</span>
          <span aria-disabled="true">Nieuwsbrieven</span>
          <span aria-disabled="true">Abonnees</span>
          {session.role === "admin" ? (
            <span aria-disabled="true">Instellingen</span>
          ) : null}
        </nav>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
