import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminConvexProvider } from "@/components/admin-convex-provider";
import { getAdminSession } from "@/lib/admin-session";
import { AdminNav } from "./admin-nav";
import { SignOutButton } from "./sign-out-button";

const roleLabels = {
  admin: "Beheerder",
  journalist: "Journalist",
  viewer: "Lezer",
} as const;

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
    <AdminConvexProvider>
      <div className="admin-shell">
        <header className="admin-header">
          <Link className="admin-wordmark" href="/admin">
            De Voetbalgazet
          </Link>
          <div className="admin-header__account">
            <span>{roleLabels[session.role]}</span>
            <span className="admin-header__email" title={session.email}>
              {session.email}
            </span>
            <SignOutButton />
          </div>
        </header>
        <div className="admin-shell__body">
          <AdminNav
            canEditArticles={session.role !== "viewer"}
            isAdmin={session.role === "admin"}
          />
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </AdminConvexProvider>
  );
}
