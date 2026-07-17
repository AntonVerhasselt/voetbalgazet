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
import {
  NewsletterEmailEditor,
  type NewsletterEmailEditorRef,
} from "@/components/newsletter-email-editor";
import { useUploadFile } from "@convex-dev/r2/react";
import type { JSONContent } from "@tiptap/core";
import { sanitizeEditorDocumentJson } from "@convex/lib/compliance";

const VALID_TYPES = [
  "welcome",
  "magic_link",
  "verify_email",
  "unsubscribe_confirmed",
] as const;

type TransactionalType = (typeof VALID_TYPES)[number];

function isValidType(s: string): s is TransactionalType {
  return (VALID_TYPES as readonly string[]).includes(s);
}

interface DienstmailDefinition {
  subject: string;
  preheader?: string;
  documentJson: string;
  canEdit: boolean;
  displayName: string;
  allowedVariableKeys: string[];
  requiredVariableKeys: string[];
  status: string;
  type: string;
}

function DienstmailEditorForm({
  type,
  definition,
}: {
  type: TransactionalType;
  definition: DienstmailDefinition;
}) {
  const updateDraft = useMutation(api.newsletterAdmin.updateDraft);
  const publishRevision = useMutation(api.newsletterAdmin.publishRevision);
  const requestTest = useMutation(api.newsletterAdmin.requestTest);
  const resolvePublicUrl = useMutation(api.r2.resolvePublicUrl);
  const uploadFile = useUploadFile({
    generateUploadUrl: api.r2.generateUploadUrl,
    syncMetadata: api.r2.syncMetadata,
  });

  const editorRef = useRef<NewsletterEmailEditorRef>(null);
  const [initialContent] = useState<JSONContent | undefined>(() => {
    try {
      return JSON.parse(
        sanitizeEditorDocumentJson(definition.documentJson),
      ) as JSONContent;
    } catch {
      return { type: "doc", content: [{ type: "paragraph" }] };
    }
  });

  const [subject, setSubject] = useState(definition.subject);
  const [preheader, setPreheader] = useState(definition.preheader ?? "");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [testEmail, setTestEmail] = useState("delivered@resend.dev");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canEdit = definition.canEdit;

  const scheduleSave = useCallback(
    (updates: {
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
          await updateDraft({ type, ...updates });
          setSaveStatus("saved");
        } catch (e) {
          setSaveStatus("error");
          setSaveError(
            e instanceof Error ? e.message : "Opslaan mislukt",
          );
        }
      }, 1500);
    },
    [canEdit, type, updateDraft],
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

  async function handlePublish() {
    setPublishing(true);
    setPublishResult(null);
    setPublishError(null);
    try {
      await publishRevision({ type });
      setPublishResult("Revisie gepubliceerd. De dienstmail is nu actief.");
    } catch (e) {
      setPublishError(
        e instanceof Error ? e.message : "Publiceren mislukt",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function handleTestSend() {
    setTestSending(true);
    setTestResult(null);
    setTestError(null);
    try {
      await requestTest({ type, toEmail: testEmail });
      setTestResult(`Testmail verzonden naar ${testEmail}.`);
    } catch (e) {
      setTestError(
        e instanceof Error ? e.message : "Testmail mislukt",
      );
    } finally {
      setTestSending(false);
    }
  }

  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">
          <Link href="/admin/email/dienstmails">Dienstmails</Link>
        </p>
        <h1>{definition.displayName}</h1>
        <p>
          Beschikbare variabelen:{" "}
          {definition.allowedVariableKeys.map((k: string) => `{{${k}}}`).join(", ") ||
            "geen"}.
          Verplicht:{" "}
          {definition.requiredVariableKeys.length > 0
            ? definition.requiredVariableKeys
                .map((k: string) => `{{${k}}}`)
                .join(", ")
            : "geen"}.
        </p>
      </header>

      {!canEdit && (
        <p className="admin-notice">
          Je hebt geen bewerkrechten voor dienstmails (alleen admin).
        </p>
      )}

      <div className="newsletter-editor-layout newsletter-editor-page">
        <div className="newsletter-editor-fields">
          <div className="newsletter-editor-fields__meta">
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

          <div className="newsletter-editor-toolbar">
            <p
              className={`newsletter-editor-save-status newsletter-editor-save-status--${saveStatus}`}
            >
              {saveStatus === "saving" && "Opslaan…"}
              {saveStatus === "saved" && "Opgeslagen"}
              {saveStatus === "error" && (saveError ?? "Opslaan mislukt")}
            </p>
          </div>
        </div>

        <div className="newsletter-editor-stage">
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
        </div>

        {canEdit && (
          <div className="newsletter-editor-actions">
            <button
              className="admin-button"
              style={{
                width: "auto",
                background: "var(--accent)",
                borderColor: "var(--accent)",
              }}
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? "Publiceren…" : "Revisie publiceren"}
            </button>
          </div>
        )}

        {publishResult && <p className="admin-notice">{publishResult}</p>}
        {publishError && <p className="admin-error">{publishError}</p>}
      </div>

      <div className="newsletter-editor-side-panels">
        <div className="newsletter-section" style={{ marginTop: "1.5rem" }}>
          <h2>Testmail versturen</h2>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="testEmail">
              Naar
            </label>
            <input
              id="testEmail"
              className="admin-field__input"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <button
            className="admin-button"
            style={{ marginTop: "0.5rem" }}
            onClick={handleTestSend}
            disabled={testSending || !canEdit}
          >
            {testSending ? "Versturen…" : "Testmail versturen"}
          </button>
          {testResult && <p className="admin-notice">{testResult}</p>}
          {testError && <p className="admin-error">{testError}</p>}
        </div>

        <div className="newsletter-section">
          <h2>Status</h2>
          <p style={{ fontSize: "0.88rem" }}>
            <strong>Status:</strong>{" "}
            {definition.status === "active" ? "✓ Actief" : "Concept"}
          </p>
          <p style={{ fontSize: "0.88rem" }}>
            <strong>Type:</strong> {definition.type}
          </p>
        </div>
      </div>
    </>
  );
}

export default function DienstmailEditorPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: typeStr } = use(params);
  const isValid = isValidType(typeStr);
  const type = isValid ? typeStr : ("welcome" as TransactionalType);

  const definition = useQuery(
    api.newsletterAdmin.getDefinition,
    isValid ? { type } : "skip",
  );

  if (!isValid) {
    return (
      <div className="admin-page-heading">
        <p className="admin-error">Ongeldig e-mailtype: {typeStr}</p>
        <Link href="/admin/email/dienstmails" className="newsletter-action-link">
          ← Terug naar dienstmails
        </Link>
      </div>
    );
  }

  if (definition === undefined) {
    return (
      <div className="admin-page-heading">
        <p className="admin-notice">Laden…</p>
      </div>
    );
  }

  if (definition === null) {
    return (
      <div className="admin-page-heading">
        <p className="admin-error">
          Dienstmail niet gevonden. Klik op &quot;Ontbrekende types aanmaken&quot; in
          het overzicht.
        </p>
        <Link href="/admin/email/dienstmails" className="newsletter-action-link">
          ← Terug naar dienstmails
        </Link>
      </div>
    );
  }

  return <DienstmailEditorForm type={type} definition={definition} />;
}
