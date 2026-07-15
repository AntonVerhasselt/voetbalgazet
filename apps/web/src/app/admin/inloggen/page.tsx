import Link from "next/link";
import { LoginForm } from "./login-form";
import { isAuthBackendConfigured } from "@/lib/auth-server";

type LoginPageProps = {
  searchParams: Promise<{ fout?: string }>;
};

export default async function AdminLoginPage({
  searchParams,
}: LoginPageProps) {
  const { fout } = await searchParams;

  return (
    <main className="admin-login">
      <section className="admin-login__panel" aria-labelledby="login-heading">
        <Link className="admin-wordmark" href="/">
          De Voetbalgazet
        </Link>
        <p className="eyebrow">Redactieomgeving</p>
        <h1 id="login-heading">Aanmelden</h1>
        <p>
          Gebruik het bevestigde GitHub-account dat door de hoofdredactie is
          toegelaten.
        </p>
        {fout ? (
          <p className="admin-error" role="alert">
            Je account kon niet aan een redactierol worden gekoppeld.
          </p>
        ) : null}
        <LoginForm backendConfigured={isAuthBackendConfigured()} />
        <Link className="text-link" href="/">
          Terug naar de voorpagina
        </Link>
      </section>
    </main>
  );
}
