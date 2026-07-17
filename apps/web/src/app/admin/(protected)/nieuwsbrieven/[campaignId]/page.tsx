"use client";

import {
  use,
  useCallback,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  NewsletterEmailEditor,
  type NewsletterEmailEditorRef,
} from "@/components/newsletter-email-editor";
import { useUploadFile } from "@convex-dev/r2/react";
import type { JSONContent } from "@tiptap/core";
import { sanitizeEditorDocumentJson } from "@convex/lib/compliance";

type SaveStatus = "idle" | "saving" | "saved" | "error";

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

function CampaignSubNav({
  campaignId,
  active,
}: {
  campaignId: string;
  active: "editor" | "publiek" | "controleren" | "resultaten";
}) {
  const base = `/admin/nieuwsbrieven/${campaignId}`;
  return (
    <nav className="campaign-subnav" aria-label="Campagnestappen">
      <Link
        href={base}
        aria-current={active === "editor" ? "page" : undefined}
      >
        Bewerken
      </Link>
      <Link
        href={`${base}/publiek`}
        aria-current={active === "publiek" ? "page" : undefined}
      >
        Publiek
      </Link>
      <Link
        href={`${base}/controleren`}
        aria-current={active === "controleren" ? "page" : undefined}
      >
        Controleren & versturen
      </Link>
      <Link
        href={`${base}/resultaten`}
        aria-current={active === "resultaten" ? "page" : undefined}
      >
        Resultaten
      </Link>
    </nav>
  );
}

interface CampaignForEditor {
  internalName: string;
  subject: string;
  preheader?: string;
  documentJson: string;
  revisionNumber: number;
  canEdit: boolean;
  status: string;
  previewHtml?: string;
}

function CampaignEditorForm({
  campaignId,
  campaignIdStr,
  campaign,
}: {
  campaignId: Id<"newsletterCampaigns">;
  campaignIdStr: string;
  campaign: CampaignForEditor;
}) {
  const updateDraft = useMutation(api.newsletterCampaigns.updateDraft);
  const resolvePublicUrl = useMutation(api.r2.resolvePublicUrl);
  const uploadFile = useUploadFile({
    generateUploadUrl: api.r2.generateUploadUrl,
    syncMetadata: api.r2.syncMetadata,
  });

  const editorRef = useRef<NewsletterEmailEditorRef>(null);
  const [internalName, setInternalName] = useState(campaign.internalName);
  const [subject, setSubject] = useState(campaign.subject);
  const [preheader, setPreheader] = useState(campaign.preheader ?? "");
  const [initialContent] = useState<JSONContent | undefined>(() => {
    try {
      return JSON.parse(
        sanitizeEditorDocumentJson(campaign.documentJson),
      ) as JSONContent;
    } catch {
      return { type: "doc", content: [{ type: "paragraph" }] };
    }
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const revisionRef = useRef<number>(campaign.revisionNumber);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canEdit = campaign.canEdit;
  const previewHtml = campaign.previewHtml ?? "";

  const scheduleSave = useCallback(
    (updates: {
      internalName?: string;
      subject?: string;
      preheader?: string;
      documentJson?: string;
    }) => {
      if (!canEdit) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("saving");
      setSaveError(null);
      saveTimerRef.current = setTimeout(async () => {
        try {
          const result = await updateDraft({
            campaignId,
            expectedRevisionNumber: revisionRef.current,
            ...updates,
          });
          revisionRef.current = result.revisionNumber;
          setSaveStatus("saved");
        } catch (e) {
          setSaveStatus("error");
          setSaveError(
            e instanceof Error ? e.message : "Opslaan mislukt",
          );
        }
      }, 1500);
    },
    [canEdit, campaignId, updateDraft],
  );

  const handleEditorUpdate = useCallback(
    (ref: NewsletterEmailEditorRef) => {
      const json = ref.getJSON();
      scheduleSave({ documentJson: JSON.stringify(json) });
    },
    [scheduleSave],
  );

  const handleUploadImage = useCallback(
    async (file: File): Promise<{ url: string }> => {
      const r2Key = await uploadFile(file);
      const { publicUrl } = await resolvePublicUrl({ r2Key });
      return { url: publicUrl };
    },
    [uploadFile, resolvePublicUrl],
  );

  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">
          <Link href="/admin/nieuwsbrieven">Nieuwsbrieven</Link>
          {" / "}
          <span
            className={`newsletter-status newsletter-status--${campaign.status}`}
          >
            {STATUS_LABELS[campaign.status] ?? campaign.status}
          </span>
        </p>
        <h1>{internalName || campaign.internalName}</h1>
      </header>

      <CampaignSubNav campaignId={campaignIdStr} active="editor" />

      {!canEdit && (
        <p className="admin-notice">
          Deze campagne is alleen-lezen (status:{" "}
          {STATUS_LABELS[campaign.status] ?? campaign.status}).
        </p>
      )}

      <div className="newsletter-editor-layout">
        {/* Left: fields + editor */}
        <div>
          <div className="newsletter-editor-fields">
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="internalName">
                Interne naam
              </label>
              <input
                id="internalName"
                className="admin-field__input"
                type="text"
                value={internalName}
                disabled={!canEdit}
                onChange={(e) => {
                  setInternalName(e.target.value);
                  scheduleSave({ internalName: e.target.value });
                }}
              />
            </div>

            <div className="admin-field">
              <label className="admin-field__label" htmlFor="subject">
                Onderwerp
              </label>
              <input
                id="subject"
                className="admin-field__input"
                type="text"
                value={subject}
                disabled={!canEdit}
                onChange={(e) => {
                  setSubject(e.target.value);
                  scheduleSave({ subject: e.target.value });
                }}
              />
            </div>

            <div className="admin-field">
              <label className="admin-field__label" htmlFor="preheader">
                Preheader (optioneel)
              </label>
              <input
                id="preheader"
                className="admin-field__input"
                type="text"
                value={preheader}
                disabled={!canEdit}
                onChange={(e) => {
                  setPreheader(e.target.value);
                  scheduleSave({ preheader: e.target.value });
                }}
              />
            </div>
          </div>

          <div className="newsletter-editor-main">
            <NewsletterEmailEditor
              ref={editorRef}
              content={initialContent}
              onUpdate={handleEditorUpdate}
              onUploadImage={canEdit ? handleUploadImage : undefined}
              editable={canEdit}
              showInspector={canEdit}
            />
          </div>

          <p
            className={`newsletter-editor-save-status newsletter-editor-save-status--${saveStatus}`}
          >
            {saveStatus === "saving" && "Opslaan…"}
            {saveStatus === "saved" && "Opgeslagen"}
            {saveStatus === "error" && (saveError ?? "Opslaan mislukt")}
          </p>
        </div>

        {/* Right: preview */}
        <div className="newsletter-preview-panel">
          <span>Voorbeeld</span>
          <button
            className="newsletter-action-btn"
            style={{ width: "fit-content" }}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "Voorbeeld verbergen" : "Voorbeeld tonen"}
          </button>
          {showPreview && (
            <iframe
              className="newsletter-preview-frame"
              srcDoc={
                previewHtml ||
                "<p style='padding:2rem;color:#888;font-family:sans-serif'>Sla eerst op om een voorbeeld te zien.</p>"
              }
              title="E-mailvoorvertoning"
              sandbox="allow-same-origin"
            />
          )}
        </div>
      </div>
    </>
  );
}

export default function CampaignEditorPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId: campaignIdStr } = use(params);
  const campaignId = campaignIdStr as Id<"newsletterCampaigns">;

  const campaignData = useQuery(api.newsletterCampaigns.getCampaign, {
    campaignId,
  });

  if (campaignData === undefined) {
    return (
      <div className="admin-page-heading">
        <p className="admin-notice">Laden…</p>
      </div>
    );
  }

  if (campaignData === null || !campaignData.campaign) {
    return (
      <div className="admin-page-heading">
        <p className="admin-error">Campagne niet gevonden.</p>
        <Link href="/admin/nieuwsbrieven" className="newsletter-action-link">
          ← Terug naar overzicht
        </Link>
      </div>
    );
  }

  return (
    <CampaignEditorForm
      campaignId={campaignId}
      campaignIdStr={campaignIdStr}
      campaign={campaignData.campaign}
    />
  );
}
