"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { AudienceRuleGroup } from "@convex/lib/audienceRules";
import { AudienceRuleBuilder } from "@/components/audience-rule-builder";

function CampaignSubNav({
  campaignId,
}: {
  campaignId: string;
}) {
  const base = `/admin/nieuwsbrieven/${campaignId}`;
  return (
    <nav className="campaign-subnav" aria-label="Campagnestappen">
      <Link href={base}>Bewerken</Link>
      <Link href={`${base}/publiek`} aria-current="page">
        Publiek
      </Link>
      <Link href={`${base}/controleren`}>Controleren & versturen</Link>
      <Link href={`${base}/resultaten`}>Resultaten</Link>
    </nav>
  );
}

export default function PubliekPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId: campaignIdStr } = use(params);
  const campaignId = campaignIdStr as Id<"newsletterCampaigns">;

  const campaignData = useQuery(api.newsletterCampaigns.getCampaign, {
    campaignId,
  });
  const catalog = useQuery(api.newsletterCampaigns.listCatalog);
  const [now] = useState(() => Date.now());
  const [ruleOverride, setRuleOverride] = useState<AudienceRuleGroup[] | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const previewAudience = useQuery(
    api.newsletterCampaigns.previewAudience,
    campaignData
      ? {
          campaignId,
          now,
          ruleGroups: ruleOverride ?? undefined,
        }
      : "skip",
  );
  const updateAudience = useMutation(api.newsletterCampaigns.updateAudience);

  const selectedRules =
    ruleOverride ?? (campaignData?.audience?.ruleGroups ?? []);

  const canEdit = campaignData?.campaign?.canEdit ?? false;

  async function handleSave(confirm = false) {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);
    if (confirm) setConfirming(true);
    try {
      await updateAudience({
        campaignId,
        ruleGroups: selectedRules,
        confirm,
      });
      setSuccessMsg(
        confirm
          ? "Publiek opgeslagen en bevestigd."
          : "Publiek opgeslagen.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout bij opslaan");
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

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

  const audience = campaignData.audience;
  const isConfirmed = Boolean(audience?.confirmedAt);

  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">
          <Link href="/admin/nieuwsbrieven">Nieuwsbrieven</Link>
          {" / "}
          <Link href={`/admin/nieuwsbrieven/${campaignIdStr}`}>
            {campaignData.campaign.internalName}
          </Link>
        </p>
        <h1>Publiek</h1>
        <p>Bouw regels om te bepalen wie deze nieuwsbrief ontvangt.</p>
      </header>

      <CampaignSubNav campaignId={campaignIdStr} />

      {isConfirmed && (
        <p className="admin-notice">
          ✓ Publiek bevestigd op{" "}
          {new Date(audience!.confirmedAt!).toLocaleString("nl-BE")}.
        </p>
      )}

      {error && <p className="admin-error">{error}</p>}
      {successMsg && <p className="admin-notice">{successMsg}</p>}

      {previewAudience && (
        <div className="newsletter-audience-stats">
          <div className="newsletter-audience-stat">
            <div>
              <div className="newsletter-audience-label">
                Actieve abonnees
              </div>
              <strong>{previewAudience.eligibleBeforeFilters}</strong>
            </div>
          </div>
          <div className="newsletter-audience-stat">
            <div>
              <div className="newsletter-audience-label">
                Na filters
              </div>
              <strong>{previewAudience.eligibleAfterFilters}</strong>
            </div>
          </div>
          <div className="newsletter-audience-stat">
            <div>
              <div className="newsletter-audience-label">
                % van actief
              </div>
              <strong>{previewAudience.percentOfActive}%</strong>
            </div>
          </div>
          {previewAudience.excludedUnsubscribe > 0 && (
            <div className="newsletter-audience-stat">
              <div>
                <div className="newsletter-audience-label">
                  Uitgeschreven
                </div>
                <strong>{previewAudience.excludedUnsubscribe}</strong>
              </div>
            </div>
          )}
          {previewAudience.excludedSuppression > 0 && (
            <div className="newsletter-audience-stat">
              <div>
                <div className="newsletter-audience-label">
                  Onderdrukt
                </div>
                <strong>{previewAudience.excludedSuppression}</strong>
              </div>
            </div>
          )}
        </div>
      )}
      {previewAudience?.description ? (
        <p className="audience-rule-description">{previewAudience.description}</p>
      ) : null}
      {previewAudience?.isApproximate ? (
        <p className="newsletter-audience-approximate">
          Bereik is bij benadering (scanlimiet bereikt). De echte verzending
          telt alle ontvangers volledig.
        </p>
      ) : null}

      {previewAudience && previewAudience.sample.length > 0 && (
        <div className="newsletter-section">
          <h2>Voorbeeldontvangers</h2>
          <ul style={{ fontSize: "0.82rem", color: "var(--ink-muted)" }}>
            {previewAudience.sample.slice(0, 10).map(
              (
                s: {
                  maskedEmail: string;
                  divisionLabels: string[];
                  teamLabel: string | null;
                },
                i: number,
              ) => (
                <li key={i}>
                  {s.maskedEmail}
                  {s.divisionLabels.length > 0 &&
                    ` — ${s.divisionLabels.join(", ")}`}
                  {s.teamLabel && ` (${s.teamLabel})`}
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      {catalog && (
        <div className="newsletter-section">
          <AudienceRuleBuilder
            catalog={catalog}
            ruleGroups={selectedRules}
            disabled={!canEdit}
            onChange={setRuleOverride}
          />
        </div>
      )}

      {canEdit && (
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <button
            className="admin-button"
            style={{ width: "auto", minWidth: "160px" }}
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving && !confirming ? "Opslaan…" : "Opslaan"}
          </button>
          <button
            className="admin-button"
            style={{
              width: "auto",
              minWidth: "160px",
              background: "var(--accent)",
              borderColor: "var(--accent)",
            }}
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {confirming ? "Bevestigen…" : "Opslaan & bevestigen"}
          </button>
        </div>
      )}
    </>
  );
}
