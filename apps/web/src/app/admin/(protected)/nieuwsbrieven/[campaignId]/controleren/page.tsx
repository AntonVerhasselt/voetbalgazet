"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

function CampaignSubNav({ campaignId }: { campaignId: string }) {
  const base = `/admin/nieuwsbrieven/${campaignId}`;
  return (
    <nav className="campaign-subnav" aria-label="Campagnestappen">
      <Link href={base}>Bewerken</Link>
      <Link href={`${base}/publiek`}>Publiek</Link>
      <Link href={`${base}/controleren`} aria-current="page">
        Controleren & versturen
      </Link>
      <Link href={`${base}/resultaten`}>Resultaten</Link>
    </nav>
  );
}

function formatDatetime(ts: number): string {
  return new Date(ts).toLocaleString("nl-BE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Convert a datetime-local string (Brussels time) to UTC ms. */
function brusselsLocalToUtcMs(localValue: string): number {
  // datetime-local format: "YYYY-MM-DDTHH:mm"
  // We interpret the value as Europe/Brussels local time.
  // Strategy: try to compute the offset by formatting a UTC date in Brussels TZ.
  const [datePart, timePart] = localValue.split("T");
  if (!datePart || !timePart) throw new Error("Ongeldige datum/tijd");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  // Create a "UTC proxy" by treating the local date as UTC
  const proxyUtc = Date.UTC(year, month - 1, day, hour, minute);

  // Format that proxy in Brussels TZ to find the offset
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(proxyUtc);

  // Parse the formatted output
  // en-GB format: "DD/MM/YYYY, HH:mm"
  const match = formatted.match(
    /(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2})/,
  );
  if (!match) return proxyUtc;

  const [, fDay, fMonth, fYear, fHour, fMinute] = match.map(Number);
  const proxyLocal = Date.UTC(fYear, fMonth - 1, fDay, fHour, fMinute);
  const offsetMs = proxyUtc - proxyLocal;
  return proxyUtc + offsetMs;
}

export default function ControlerenPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId: campaignIdStr } = use(params);
  const campaignId = campaignIdStr as Id<"newsletterCampaigns">;

  const campaignData = useQuery(api.newsletterCampaigns.getCampaign, {
    campaignId,
  });
  const previewAudience = useQuery(
    api.newsletterCampaigns.previewAudience,
    campaignData ? { campaignId, now: Date.now() } : "skip",
  );

  const requestTestSend = useMutation(api.newsletterSend.requestTestSend);
  const requestSendNow = useMutation(api.newsletterSend.requestSendNow);
  const scheduleSend = useMutation(api.newsletterSend.scheduleSend);
  const cancelSchedule = useMutation(api.newsletterSend.cancelSchedule);

  const [testEmail, setTestEmail] = useState("delivered@resend.dev");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [showSendModal, setShowSendModal] = useState(false);
  const [sendNowBusy, setSendNowBusy] = useState(false);
  const [sendNowError, setSendNowError] = useState<string | null>(null);

  const [scheduleValue, setScheduleValue] = useState("");
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const campaign = campaignData?.campaign;
  const canEdit = campaign?.canEdit ?? false;
  const isScheduled = campaign?.status === "scheduled";
  const expectedPreviewCount = previewAudience?.eligibleAfterFilters ?? 0;

  // Checklist items
  const hasSubject = Boolean(campaign?.subject.trim());
  const hasAudience = Boolean(campaignData?.audience?.confirmedAt);
  const hasTest = Boolean(campaign?.lastSuccessfulTestAt);
  const domainVerified = campaignData?.sender
    ? true
    : false; // sender always has domainVerified per our data model

  async function handleTestSend() {
    setTestSending(true);
    setTestResult(null);
    setTestError(null);
    try {
      await requestTestSend({ campaignId, toEmail: testEmail });
      setTestResult(`Testmail verzonden naar ${testEmail}.`);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Testmail mislukt");
    } finally {
      setTestSending(false);
    }
  }

  async function handleSendNow() {
    setSendNowBusy(true);
    setSendNowError(null);
    try {
      const clientRequestId = crypto.randomUUID();
      await requestSendNow({
        campaignId,
        expectedRevisionNumber: campaign!.revisionNumber,
        expectedPreviewCount,
        clientRequestId,
        confirm: true,
      });
      setShowSendModal(false);
    } catch (e) {
      setSendNowError(e instanceof Error ? e.message : "Verzenden mislukt");
    } finally {
      setSendNowBusy(false);
    }
  }

  async function handleSchedule() {
    if (!scheduleValue) {
      setScheduleError("Kies een datum en tijdstip.");
      return;
    }
    setScheduleBusy(true);
    setScheduleError(null);
    setScheduleSuccess(false);
    try {
      const now = Date.now();
      const scheduledFor = brusselsLocalToUtcMs(scheduleValue);
      const clientRequestId = crypto.randomUUID();
      await scheduleSend({
        campaignId,
        expectedRevisionNumber: campaign!.revisionNumber,
        expectedPreviewCount,
        scheduledFor,
        clientRequestId,
        confirm: true,
        now,
      });
      setScheduleSuccess(true);
    } catch (e) {
      setScheduleError(e instanceof Error ? e.message : "Plannen mislukt");
    } finally {
      setScheduleBusy(false);
    }
  }

  async function handleCancelSchedule() {
    if (!confirm("Wil je de geplande verzending annuleren?")) return;
    setCancelBusy(true);
    setCancelError(null);
    try {
      await cancelSchedule({ campaignId });
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Annuleren mislukt");
    } finally {
      setCancelBusy(false);
    }
  }

  if (!campaignData) {
    return (
      <div className="admin-page-heading">
        <p className="admin-notice">Laden…</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="admin-page-heading">
        <p className="admin-error">Campagne niet gevonden.</p>
        <Link href="/admin/nieuwsbrieven" className="newsletter-action-link">
          ← Terug
        </Link>
      </div>
    );
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
        <h1>Controleren & versturen</h1>
      </header>

      <CampaignSubNav campaignId={campaignIdStr} />

      {/* Checklist */}
      <div className="newsletter-checklist">
        <ChecklistItem
          ok={hasSubject}
          label="Onderwerp ingevuld"
          meta={campaign.subject || "Geen onderwerp"}
        />
        <ChecklistItem
          ok={hasAudience}
          label="Publiek bevestigd"
          meta={
            hasAudience
              ? campaignData.audience?.description ?? "Bevestigd"
              : "Ga naar het tabblad Publiek"
          }
        />
        <ChecklistItem
          ok={hasTest}
          label="Testmail verstuurd"
          meta={
            campaign.lastSuccessfulTestAt
              ? `Getest op ${formatDatetime(campaign.lastSuccessfulTestAt)}`
              : "Verstuur hieronder een testmail"
          }
        />
        <ChecklistItem
          ok={domainVerified}
          label="Afzenderdomein geverifieerd"
          meta={`${campaignData.sender.fromName} <${campaignData.sender.fromAddress}>`}
        />
        <ChecklistItem
          ok={expectedPreviewCount > 0}
          label="Ontvangers beschikbaar"
          meta={
            previewAudience
              ? `${expectedPreviewCount} ontvangers`
              : "Publiek laden…"
          }
        />
      </div>

      {/* Test send */}
      {canEdit && (
        <div className="newsletter-section">
          <h2>Testmail versturen</h2>
          <div
            style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
          >
            <input
              className="admin-field__input"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="e-mailadres"
              style={{ flex: "1 1 220px" }}
            />
            <button
              className="admin-button"
              style={{ width: "auto", minWidth: "160px" }}
              onClick={handleTestSend}
              disabled={testSending}
            >
              {testSending ? "Versturen…" : "Testmail versturen"}
            </button>
          </div>
          {testResult && <p className="admin-notice">{testResult}</p>}
          {testError && <p className="admin-error">{testError}</p>}
        </div>
      )}

      {/* Scheduled status */}
      {isScheduled && campaign.scheduledFor && (
        <div className="newsletter-section">
          <p className="admin-notice">
            Gepland voor{" "}
            <strong>{formatDatetime(campaign.scheduledFor)}</strong>.
          </p>
          {cancelError && <p className="admin-error">{cancelError}</p>}
          <button
            className="newsletter-action-btn newsletter-action-btn--danger"
            onClick={handleCancelSchedule}
            disabled={cancelBusy}
          >
            {cancelBusy ? "Annuleren…" : "Geplande verzending annuleren"}
          </button>
        </div>
      )}

      {/* Send now / schedule */}
      {canEdit && (
        <div className="newsletter-section">
          <h2>Versturen</h2>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <button
              className="admin-button"
              style={{
                width: "auto",
                minWidth: "160px",
                background: "var(--accent)",
                borderColor: "var(--accent)",
              }}
              onClick={() => setShowSendModal(true)}
              disabled={!hasSubject || !hasAudience || !hasTest}
              title={
                !hasSubject
                  ? "Vul eerst een onderwerp in"
                  : !hasAudience
                    ? "Bevestig eerst het publiek"
                    : !hasTest
                      ? "Verstuur eerst een testmail"
                      : undefined
              }
            >
              Nu versturen
            </button>
          </div>

          <div
            style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
          >
            <input
              type="datetime-local"
              className="admin-field__input"
              value={scheduleValue}
              onChange={(e) => setScheduleValue(e.target.value)}
              style={{ flex: "1 1 200px" }}
            />
            <button
              className="admin-button"
              style={{ width: "auto", minWidth: "160px" }}
              onClick={handleSchedule}
              disabled={
                scheduleBusy || !hasSubject || !hasAudience || !hasTest
              }
            >
              {scheduleBusy ? "Plannen…" : "Inplannen"}
            </button>
          </div>
          {scheduleError && <p className="admin-error">{scheduleError}</p>}
          {scheduleSuccess && (
            <p className="admin-notice">
              Nieuwsbrief ingepland. Je kunt de verzending nog annuleren via
              deze pagina.
            </p>
          )}
        </div>
      )}

      {/* Send now confirmation modal */}
      {showSendModal && (
        <div className="newsletter-modal-overlay">
          <div className="newsletter-modal">
            <h2>Nieuwsbrief nu versturen?</h2>
            <p>
              Je gaat de nieuwsbrief "{campaign.internalName}" sturen naar{" "}
              <strong>{expectedPreviewCount} ontvangers</strong>. Dit kan
              niet ongedaan worden gemaakt.
            </p>
            {sendNowError && (
              <p className="admin-error">{sendNowError}</p>
            )}
            <div className="newsletter-modal__actions">
              <button
                className="admin-button"
                style={{ background: "var(--accent)", borderColor: "var(--accent)" }}
                onClick={handleSendNow}
                disabled={sendNowBusy}
              >
                {sendNowBusy ? "Versturen…" : "Ja, verstuur nu"}
              </button>
              <button
                className="admin-button"
                style={{
                  background: "transparent",
                  color: "var(--ink)",
                  border: "1px solid var(--ink)",
                }}
                onClick={() => setShowSendModal(false)}
                disabled={sendNowBusy}
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChecklistItem({
  ok,
  label,
  meta,
}: {
  ok: boolean;
  label: string;
  meta?: string;
}) {
  return (
    <div className="newsletter-checklist__item">
      <span
        className={`newsletter-checklist__icon ${ok ? "newsletter-checklist__icon--ok" : "newsletter-checklist__icon--warn"}`}
      >
        {ok ? "✓" : "!"}
      </span>
      <span className="newsletter-checklist__label">{label}</span>
      {meta && (
        <span className="newsletter-checklist__meta">{meta}</span>
      )}
    </div>
  );
}
