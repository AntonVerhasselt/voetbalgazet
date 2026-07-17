"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { captureAdminEvent } from "@/lib/analytics";

const STATUS_LABELS: Record<string, string> = {
  draft: "Concept",
  scheduled: "Gepland",
  preparing: "Ontvangers voorbereiden",
  sending: "Wordt verzonden",
  sent: "Verzonden",
  partially_failed: "Deels mislukt",
  failed: "Mislukt",
  cancelled: "Geannuleerd",
};

function CampaignSubNav({ campaignId }: { campaignId: string }) {
  const base = `/admin/nieuwsbrieven/${campaignId}`;
  return (
    <nav className="campaign-subnav" aria-label="Campagnestappen">
      <Link href={base}>Bewerken</Link>
      <Link href={`${base}/publiek`}>Publiek</Link>
      <Link href={`${base}/controleren`}>Controleren & versturen</Link>
      <Link href={`${base}/resultaten`} aria-current="page">
        Resultaten
      </Link>
    </nav>
  );
}

export default function ResultatenPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId: campaignIdStr } = use(params);
  const campaignId = campaignIdStr as Id<"newsletterCampaigns">;
  const [recoverMessage, setRecoverMessage] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);

  const campaignData = useQuery(api.newsletterCampaigns.getCampaign, {
    campaignId,
  });
  const sendResults = useQuery(api.newsletterSend.getSendResults, {
    campaignId,
  });
  const failedRecipients = useQuery(
    api.newsletterSend.listFailedRecipients,
    sendResults?.send
      ? { sendId: sendResults.send._id, limit: 50 }
      : "skip",
  );
  const recoverFailed = useMutation(api.newsletterSend.recoverFailedRecipients);

  if (!campaignData) {
    return (
      <div className="admin-page-heading">
        <p className="admin-notice">Laden…</p>
      </div>
    );
  }

  if (!campaignData.campaign) {
    return (
      <div className="admin-page-heading">
        <p className="admin-error">Campagne niet gevonden.</p>
        <Link href="/admin/nieuwsbrieven" className="newsletter-action-link">
          ← Terug
        </Link>
      </div>
    );
  }

  const campaign = campaignData.campaign;
  const send = sendResults?.send;

  async function handleRecoverAll(): Promise<void> {
    if (!send) {
      return;
    }
    setRecovering(true);
    setRecoverMessage(null);
    try {
      const result = await recoverFailed({ sendId: send._id });
      captureAdminEvent("newsletter_failed_recipients_recovered", {
        campaign_analytics_id: send.analyticsId,
        requeued: result.requeued,
      });
      setRecoverMessage(
        result.requeued > 0
          ? `${result.requeued} mislukte ontvangers opnieuw in de wachtrij gezet.`
          : "Geen herstelbare ontvangers gevonden.",
      );
    } catch (error) {
      setRecoverMessage(
        error instanceof Error ? error.message : "Herstel mislukt.",
      );
    } finally {
      setRecovering(false);
    }
  }

  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">
          <Link href="/admin/nieuwsbrieven">Nieuwsbrieven</Link>
          {" / "}
          <Link href={`/admin/nieuwsbrieven/${campaignIdStr}`}>
            {campaign.internalName}
          </Link>
        </p>
        <h1>Resultaten</h1>
      </header>

      <CampaignSubNav campaignId={campaignIdStr} />

      {sendResults === undefined && (
        <p className="admin-notice">Statistieken laden…</p>
      )}

      {sendResults === null && (
        <p className="admin-notice">
          Er zijn nog geen verzendstatistieken beschikbaar. Verstuur de
          nieuwsbrief via het tabblad{" "}
          <Link href={`/admin/nieuwsbrieven/${campaignIdStr}/controleren`}>
            Controleren & versturen
          </Link>
          .
        </p>
      )}

      {send && (
        <>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              marginBlock: "1rem",
              alignItems: "center",
            }}
          >
            <span
              className={`newsletter-status newsletter-status--${send.status}`}
            >
              {STATUS_LABELS[send.status] ?? send.status}
            </span>
            <span style={{ color: "var(--ink-muted)", fontSize: "0.82rem" }}>
              Aangevraagd{" "}
              {new Date(send.requestedAt).toLocaleString("nl-BE", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            {send.completedAt && (
              <span style={{ color: "var(--ink-muted)", fontSize: "0.82rem" }}>
                · Voltooid{" "}
                {new Date(send.completedAt).toLocaleString("nl-BE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            )}
          </div>

          {send.lastErrorCode && (
            <p className="admin-error">
              Foutcode: <code>{send.lastErrorCode}</code>
            </p>
          )}

          <div className="newsletter-results-grid">
            <StatCard
              value={send.expectedRecipientCount ?? 0}
              label="Verwacht"
            />
            <StatCard value={send.queuedCount} label="In wachtrij" />
            <StatCard value={send.deliveredCount} label="Afgeleverd" />
            <StatCard value={send.openedCount} label="Geopend (indicatief)" />
            <StatCard value={send.clickedCount} label="Geklikt (indicatief)" />
            <StatCard value={send.bouncedCount} label="Teruggestuurd" />
            <StatCard value={send.complainedCount} label="Klachten" />
            <StatCard value={send.failedCount} label="Mislukt" />
            <StatCard value={send.suppressedCount} label="Onderdrukt" />
          </div>

          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--ink-muted)",
              marginTop: "0.5rem",
            }}
          >
            Open- en klikcijfers zijn indicatief (afhankelijk van
            mailclienttracking) en geen exacte lezersaantallen.
          </p>

          {send.failedCount > 0 && (
            <section className="admin-panel" style={{ marginTop: "1.5rem" }}>
              <h2>Mislukte ontvangers</h2>
              <p style={{ color: "var(--ink-muted)", fontSize: "0.9rem" }}>
                Gemaskeerde adressen. Herstel zet herstelbare rijen opnieuw in
                de verzendwachtrij.
              </p>
              {failedRecipients === undefined && (
                <p className="admin-notice">Laden…</p>
              )}
              {failedRecipients && failedRecipients.length === 0 && (
                <p className="admin-notice">
                  Geen mislukte rijen meer zichtbaar.
                </p>
              )}
              {failedRecipients && failedRecipients.length > 0 && (
                <ul className="admin-simple-list">
                  {failedRecipients.map((row) => (
                    <li key={row.recipientId}>
                      <code>{row.maskedEmail}</code>
                      {row.errorCode ? ` — ${row.errorCode}` : ""}
                      {row.recoverable ? "" : " (niet herstelbaar)"}
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="signup-form__primary"
                disabled={recovering || (failedRecipients?.length ?? 0) === 0}
                onClick={() => {
                  void handleRecoverAll();
                }}
              >
                {recovering ? "Herstellen…" : "Herstel mislukte ontvangers"}
              </button>
              {recoverMessage && (
                <p className="admin-notice" style={{ marginTop: "0.75rem" }}>
                  {recoverMessage}
                </p>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="newsletter-results-stat">
      <strong>{value.toLocaleString("nl-BE")}</strong>
      <span>{label}</span>
    </div>
  );
}
