import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentLoginForm } from "./agent-login-form";
import { isAgentAccessEnabled } from "@/lib/agent-access";
import { isAuthBackendConfigured } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Agenttoegang",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AgentLoginPage() {
  if (!isAgentAccessEnabled()) {
    notFound();
  }

  return (
    <main className="admin-login">
      <section className="admin-login__panel" aria-labelledby="agent-login-heading">
        <Link className="admin-wordmark" href="/">
          De Voetbalgazet
        </Link>
        <p className="eyebrow">Interne toegang</p>
        <h1 id="agent-login-heading">Agenttoegang</h1>
        <p>
          Alleen voor geautomatiseerde redactietests. Niet bedoeld voor
          journalisten.
        </p>
        {!isAuthBackendConfigured() ? (
          <p className="admin-notice" role="status">
            De Convex-authomgeving is nog niet geconfigureerd.
          </p>
        ) : (
          <AgentLoginForm />
        )}
        <Link className="text-link" href="/admin/inloggen">
          Terug naar GitHub-aanmelding
        </Link>
      </section>
    </main>
  );
}
