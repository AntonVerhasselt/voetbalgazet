"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DienstmailsPage() {
  const definitions = useQuery(api.newsletterAdmin.listDefinitions);
  const ensureDefinitions = useMutation(
    api.newsletterAdmin.ensureDefinitions,
  );
  const [ensuring, setEnsuring] = useState(false);
  const [ensureResult, setEnsureResult] = useState<string | null>(null);
  const [ensureError, setEnsureError] = useState<string | null>(null);

  async function handleEnsure() {
    setEnsuring(true);
    setEnsureResult(null);
    setEnsureError(null);
    try {
      const created = await ensureDefinitions({});
      setEnsureResult(
        created === 0
          ? "Alle dienstmail-types bestaan al."
          : `${created} type(s) aangemaakt.`,
      );
    } catch (e) {
      setEnsureError(
        e instanceof Error ? e.message : "Fout bij initialiseren",
      );
    } finally {
      setEnsuring(false);
    }
  }

  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">E-mail</p>
        <h1>Dienstmails</h1>
        <p>
          Transactionele e-mails die automatisch worden verstuurd, zoals
          welkomstmails en verificatielinks.
        </p>
      </header>

      <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          className="admin-button"
          style={{ width: "auto" }}
          onClick={handleEnsure}
          disabled={ensuring}
        >
          {ensuring ? "Initialiseren…" : "Ontbrekende types aanmaken"}
        </button>
        {ensureResult && (
          <span className="admin-notice" style={{ margin: 0 }}>
            {ensureResult}
          </span>
        )}
        {ensureError && (
          <span className="admin-error" style={{ margin: 0 }}>
            {ensureError}
          </span>
        )}
      </div>

      <div className="dienstmails-list">
        {definitions === undefined ? (
          <div className="dienstmails-item">
            <span style={{ color: "var(--ink-muted)" }}>Laden…</span>
          </div>
        ) : definitions.length === 0 ? (
          <div className="dienstmails-item">
            <span style={{ color: "var(--ink-muted)" }}>
              Geen dienstmails gevonden. Klik op "Ontbrekende types aanmaken"
              hierboven.
            </span>
          </div>
        ) : (
          definitions.map((def: {
            _id: Id<"transactionalEmailDefinitions">;
            type: string;
            displayName: string;
            status: string;
            subject: string;
            updatedAt: number;
            hasActiveRevision: boolean;
          }) => (
            <div className="dienstmails-item" key={def._id}>
              <div className="dienstmails-item__info">
                <span className="dienstmails-item__name">
                  {def.displayName}
                </span>
                <span className="dienstmails-item__subject">
                  {def.subject}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.68rem",
                    color: "var(--ink-muted)",
                    marginTop: "0.15rem",
                  }}
                >
                  {def.hasActiveRevision ? "✓ Actief" : "Concept"} ·
                  bijgewerkt {formatDate(def.updatedAt)}
                </span>
              </div>
              <Link
                href={`/admin/email/dienstmails/${def.type}`}
                className="newsletter-action-link"
              >
                Bewerken
              </Link>
            </div>
          ))
        )}
      </div>
    </>
  );
}
