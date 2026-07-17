"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

export default function InstellingenPage() {
  const settings = useQuery(api.newsletterAdmin.getSenderSettings);
  const updateSenderSettings = useMutation(
    api.newsletterAdmin.updateSenderSettings,
  );

  const [fromNameOverride, setFromNameOverride] = useState<string | null>(null);
  const [fromAddressOverride, setFromAddressOverride] = useState<
    string | null
  >(null);
  const [replyToOverride, setReplyToOverride] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fromName = fromNameOverride ?? settings?.fromName ?? "";
  const fromAddress = fromAddressOverride ?? settings?.fromAddress ?? "";
  const replyTo = replyToOverride ?? settings?.replyTo ?? "";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveResult(null);
    setSaveError(null);
    try {
      await updateSenderSettings({ fromName, fromAddress, replyTo });
      setSaveResult("Instellingen opgeslagen.");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Opslaan mislukt",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">E-mail</p>
        <h1>Instellingen</h1>
        <p>Configureer de afzender voor nieuwsbrieven en dienstmails.</p>
      </header>

      {settings === undefined ? (
        <p className="admin-notice">Laden…</p>
      ) : (
        <form onSubmit={handleSave} style={{ maxWidth: "540px", marginTop: "1.5rem" }}>
          <div
            style={{ display: "grid", gap: "1rem" }}
          >
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="fromName">
                Naam afzender
              </label>
              <input
                id="fromName"
                className="admin-field__input"
                type="text"
                value={fromName}
                onChange={(e) => setFromNameOverride(e.target.value)}
                required
              />
            </div>

            <div className="admin-field">
              <label className="admin-field__label" htmlFor="fromAddress">
                E-mailadres afzender
              </label>
              <input
                id="fromAddress"
                className="admin-field__input"
                type="email"
                value={fromAddress}
                onChange={(e) => setFromAddressOverride(e.target.value)}
                required
              />
            </div>

            <div className="admin-field">
              <label className="admin-field__label" htmlFor="replyTo">
                Reply-to adres
              </label>
              <input
                id="replyTo"
                className="admin-field__input"
                type="email"
                value={replyTo}
                onChange={(e) => setReplyToOverride(e.target.value)}
                required
              />
            </div>
          </div>

          {saveResult && <p className="admin-notice">{saveResult}</p>}
          {saveError && <p className="admin-error">{saveError}</p>}

          <button
            className="admin-button"
            type="submit"
            disabled={saving}
            style={{ marginTop: "1.25rem" }}
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </form>
      )}

      {settings && (
        <div style={{ marginTop: "2rem" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.2rem",
              marginBottom: "0.75rem",
            }}
          >
            Technische informatie
          </h2>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "max-content 1fr",
              gap: "0.35rem 1.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
            }}
          >
            <dt style={{ color: "var(--ink-muted)", textTransform: "uppercase" }}>
              Verzenddomein
            </dt>
            <dd style={{ margin: 0 }}>{settings.sendingDomain}</dd>
            <dt style={{ color: "var(--ink-muted)", textTransform: "uppercase" }}>
              Media CDN
            </dt>
            <dd style={{ margin: 0 }}>{settings.mediaCdnHost}</dd>
            <dt style={{ color: "var(--ink-muted)", textTransform: "uppercase" }}>
              Domein geverifieerd
            </dt>
            <dd style={{ margin: 0 }}>
              {settings.domainVerified ? "✓ Ja" : "✗ Nee"}
            </dd>
            <dt style={{ color: "var(--ink-muted)", textTransform: "uppercase" }}>
              Live verzending
            </dt>
            <dd style={{ margin: 0 }}>
              {settings.liveSendEnabled ? "✓ Ingeschakeld" : "✗ Uitgeschakeld"}
            </dd>
          </dl>
        </div>
      )}
    </>
  );
}
