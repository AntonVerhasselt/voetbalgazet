"use client";

import {
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { EmailEditor, type EmailEditorRef } from "@react-email/editor";
import "@react-email/editor/themes/default.css";
import type { JSONContent } from "@tiptap/core";

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
  const updateDraft = useMutation(api.newsletterAdmin.updateDraft);
  const publishRevision = useMutation(api.newsletterAdmin.publishRevision);
  const requestTest = useMutation(api.newsletterAdmin.requestTest);

  const editorRef = useRef<EmailEditorRef>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [initialContent, setInitialContent] = useState<
    JSONContent | undefined
  >(undefined);
  const [editorReady, setEditorReady] = useState(false);

  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!definition || editorReady) return;
    setSubject(definition.subject);
    setPreheader(definition.preheader ?? "");
    try {
      setInitialContent(
        JSON.parse(definition.documentJson) as JSONContent,
      );
    } catch {
      setInitialContent(undefined);
    }
    setEditorReady(true);
  }, [definition, editorReady]);

  const canEdit = definition?.canEdit ?? false;

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
    (ref: EmailEditorRef) => {
      const json = ref.getJSON();
      scheduleSave({ documentJson: JSON.stringify(json) });
    },
    [scheduleSave],
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
          Dienstmail niet gevonden. Klik op "Ontbrekende types aanmaken" in
          het overzicht.
        </p>
        <Link href="/admin/email/dienstmails" className="newsletter-action-link">
          ← Terug naar dienstmails
        </Link>
      </div>
    );
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

      <div className="newsletter-editor-layout">
        {/* Left: fields + editor */}
        <div>
          <div className="newsletter-editor-fields">
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
            {isMounted && editorReady ? (
              <EmailEditor
                ref={editorRef}
                content={initialContent}
                onUpdate={handleEditorUpdate}
                editable={canEdit}
              />
            ) : (
              <div style={{ padding: "2rem", color: "var(--ink-muted)" }}>
                Editor laden…
              </div>
            )}
          </div>

          <p
            className={`newsletter-editor-save-status newsletter-editor-save-status--${saveStatus}`}
          >
            {saveStatus === "saving" && "Opslaan…"}
            {saveStatus === "saved" && "Opgeslagen"}
            {saveStatus === "error" && (saveError ?? "Opslaan mislukt")}
          </p>

          {canEdit && (
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                marginTop: "1rem",
                flexWrap: "wrap",
              }}
            >
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

        {/* Right: test send */}
        <div>
          <div className="newsletter-section" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
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
      </div>
    </>
  );
}
