"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePaginatedQuery, useMutation } from "convex/react";
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

type Tab = "draft" | "scheduled" | "sent" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "draft", label: "Concepten" },
  { key: "scheduled", label: "Gepland" },
  { key: "sent", label: "Verzonden" },
  { key: "all", label: "Alles" },
];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NieuwsbrievenPage() {
  const [tab, setTab] = useState<Tab>("draft");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createCampaign = useMutation(api.newsletterCampaigns.createCampaign);
  const duplicateCampaign = useMutation(
    api.newsletterCampaigns.duplicateCampaign,
  );
  const deleteDraft = useMutation(api.newsletterCampaigns.deleteDraft);

  const { results, status, loadMore } = usePaginatedQuery(
    api.newsletterCampaigns.listCampaigns,
    { tab },
    { initialNumItems: 20 },
  );

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const id = await createCampaign({});
      router.push(`/admin/nieuwsbrieven/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout bij aanmaken");
      setCreating(false);
    }
  }

  async function handleDuplicate(campaignId: Id<"newsletterCampaigns">) {
    setError(null);
    try {
      const id = await duplicateCampaign({ campaignId });
      router.push(`/admin/nieuwsbrieven/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout bij dupliceren");
    }
  }

  async function handleDelete(campaignId: Id<"newsletterCampaigns">) {
    if (!confirm("Wil je dit concept definitief verwijderen?")) return;
    setError(null);
    try {
      await deleteDraft({ campaignId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout bij verwijderen");
    }
  }

  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">Nieuwsbrieven</p>
        <h1>Campagnes</h1>
        <p>Beheer en verstuur nieuwsbriefcampagnes naar abonnees.</p>
      </header>

      <div className="newsletter-toolbar">
        <nav className="newsletter-tabs" aria-label="Campagnestatus filteren">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={
                tab === t.key
                  ? "newsletter-tabs__tab newsletter-tabs__tab--active"
                  : "newsletter-tabs__tab"
              }
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button
          className="admin-button newsletter-create-btn"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? "Aanmaken…" : "Nieuw concept"}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="newsletter-list">
        {results === undefined ? (
          <p className="newsletter-list__empty">Laden…</p>
        ) : results.length === 0 ? (
          <p className="newsletter-list__empty">Geen campagnes gevonden.</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="newsletter-list__table">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Onderwerp</th>
                  <th>Status</th>
                  <th>Bijgewerkt</th>
                  <th>Publiek</th>
                  <th>Acties</th>
                </tr>
              </thead>
              <tbody>
                {results.map((campaign) => (
                  <tr key={campaign._id}>
                    <td>
                      <Link href={`/admin/nieuwsbrieven/${campaign._id}`}>
                        {campaign.internalName}
                      </Link>
                    </td>
                    <td className="newsletter-list__subject">
                      {campaign.subject || <em>Geen onderwerp</em>}
                    </td>
                    <td>
                      <span
                        className={`newsletter-status newsletter-status--${campaign.status}`}
                      >
                        {STATUS_LABELS[campaign.status] ?? campaign.status}
                      </span>
                    </td>
                    <td className="newsletter-list__date">
                      {formatDate(campaign.updatedAt)}
                    </td>
                    <td className="newsletter-list__audience">
                      {campaign.audienceDescription}
                    </td>
                    <td className="newsletter-list__actions">
                      <Link
                        href={`/admin/nieuwsbrieven/${campaign._id}`}
                        className="newsletter-action-link"
                      >
                        {campaign.status === "draft" ? "Bewerken" : "Bekijken"}
                      </Link>
                      <button
                        className="newsletter-action-btn"
                        onClick={() => handleDuplicate(campaign._id)}
                      >
                        Dupliceren
                      </button>
                      {campaign.status === "draft" && (
                        <button
                          className="newsletter-action-btn newsletter-action-btn--danger"
                          onClick={() => handleDelete(campaign._id)}
                        >
                          Verwijderen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {status === "CanLoadMore" && (
          <button
            className="admin-button newsletter-load-more"
            onClick={() => loadMore(20)}
          >
            Meer laden
          </button>
        )}
        {status === "LoadingMore" && (
          <p className="newsletter-list__empty">Laden…</p>
        )}
      </div>
    </>
  );
}
