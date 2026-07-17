"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

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

  const campaignData = useQuery(api.newsletterCampaigns.getCampaign, {
    campaignId,
  });
  const sendResults = useQuery(api.newsletterSend.getSendResults, {
    campaignId,
  });

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
            <StatCard value={send.openedCount} label="Geopend" />
            <StatCard value={send.clickedCount} label="Geklikt" />
            <StatCard value={send.bouncedCount} label="Teruggestuurd" />
            <StatCard value={send.complainedCount} label="Klachten" />
            <StatCard value={send.failedCount} label="Mislukt" />
            <StatCard value={send.suppressedCount} label="Onderdrukt" />
          </div>

          {["sent", "partially_failed"].includes(send.status) &&
            send.queuedCount > 0 && (
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--ink-muted)",
                  marginTop: "0.5rem",
                }}
              >
                Openings- en klikstatistieken worden bijgewerkt naarmate
                ontvangers de e-mail openen.
              </p>
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
