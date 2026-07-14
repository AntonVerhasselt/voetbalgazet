"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import type { EmailEditorRef } from "@react-email/editor";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { AdminShell } from "@/components/AdminShell";
import { AudienceFilterPanel } from "@/components/AudienceFilterPanel";

const EmailEditor = dynamic(
  () => import("@react-email/editor").then((mod) => mod.EmailEditor),
  { ssr: false, loading: () => <div className="p-8 text-[#666]">Editor laden...</div> },
);

import "@react-email/editor/themes/default.css";

export default function NewsletterEditorPage() {
  const params = useParams();
  const router = useRouter();
  const emailId = params.id as Id<"newsletterEmails">;
  const editorRef = useRef<EmailEditorRef>(null);

  const email = useQuery(api.newsletterEmails.get, { emailId });
  const updateEmail = useMutation(api.newsletterEmails.update);
  const sendTest = useMutation(api.emailSending.sendTest);
  const sendToAudience = useMutation(api.emailSending.sendToAudience);

  const [name, setName] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [preheader, setPreheader] = useState<string | null>(null);
  const [testAddress, setTestAddress] = useState("");
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isReadOnly = email?.status === "sent" || email?.status === "sending";

  const handleSave = useCallback(async () => {
    if (!editorRef.current || !email) return;

    setSaving(true);
    setMessage(null);

    try {
      const html = await editorRef.current.getEmailHTML();
      const json = editorRef.current.getJSON();

      await updateEmail({
        emailId,
        name: name ?? email.name,
        subject: subject ?? email.subject,
        preheader: preheader ?? email.preheader,
        editorHtml: html,
        editorJson: JSON.stringify(json),
        renderedHtml: html,
      });

      setMessage("Opgeslagen");
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }, [email, emailId, name, subject, preheader, updateEmail]);

  const handleTestSend = async () => {
    if (!editorRef.current || !testAddress) return;

    setSending(true);
    setMessage(null);

    try {
      const html = await editorRef.current.getEmailHTML();
      await sendTest({ emailId, testAddress, renderedHtml: html });
      setMessage(`Test verzonden naar ${testAddress}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test verzenden mislukt");
    } finally {
      setSending(false);
    }
  };

  const handleSendToAudience = async (audienceFilter: {
    newsletterSubscribedOnly: boolean;
    divisionIds?: Id<"divisions">[];
    favoriteTeamIds?: Id<"teams">[];
    matchMode?: "any" | "all";
  }) => {
    if (!editorRef.current) return;

    if (!confirm("Weet je zeker dat je deze nieuwsbrief wilt versturen?")) {
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const html = await editorRef.current.getEmailHTML();
      await updateEmail({
        emailId,
        renderedHtml: html,
        audienceFilter,
      });

      const result = await sendToAudience({
        emailId,
        renderedHtml: html,
        audienceFilter,
      });

      setMessage(`Verzonden naar ${result.recipientCount} abonnees`);
      setShowSendPanel(false);
      router.push("/admin/newsletter");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verzenden mislukt");
    } finally {
      setSending(false);
    }
  };

  if (!email) {
    return (
      <AdminShell>
        <p className="text-[#666]">Laden...</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <input
            type="text"
            value={name ?? email.name}
            onChange={(e) => setName(e.target.value)}
            disabled={isReadOnly}
            className="w-full border-b border-[#1a1a1a]/20 bg-transparent font-[family-name:var(--font-playfair)] text-2xl font-semibold focus:border-[#1a1a1a] focus:outline-none disabled:opacity-60"
            placeholder="Naam van de nieuwsbrief"
          />
          <input
            type="text"
            value={subject ?? email.subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isReadOnly}
            className="w-full border-b border-[#1a1a1a]/10 bg-transparent text-lg focus:border-[#1a1a1a] focus:outline-none disabled:opacity-60"
            placeholder="Onderwerp"
          />
          <input
            type="text"
            value={preheader ?? email.preheader ?? ""}
            onChange={(e) => setPreheader(e.target.value)}
            disabled={isReadOnly}
            className="w-full border-b border-[#1a1a1a]/10 bg-transparent text-sm text-[#666] focus:border-[#1a1a1a] focus:outline-none disabled:opacity-60"
            placeholder="Preheader (inbox preview)"
          />
        </div>

        <div className="flex flex-col items-end gap-2">
          {message && (
            <p className="text-sm text-green-700">{message}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/admin/newsletter")}
              className="border border-[#1a1a1a]/20 px-4 py-2 text-sm hover:bg-white transition-colors"
            >
              Terug
            </button>
            {!isReadOnly && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="border border-[#1a1a1a]/20 bg-white px-4 py-2 text-sm hover:bg-[#faf8f4] transition-colors disabled:opacity-50"
                >
                  {saving ? "Opslaan..." : "Opslaan"}
                </button>
                <button
                  onClick={() => setShowSendPanel(!showSendPanel)}
                  className="bg-[#1a1a1a] px-4 py-2 text-sm text-white hover:bg-[#333] transition-colors"
                >
                  Versturen
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {isReadOnly && (
        <div className="mb-4 border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          Deze nieuwsbrief is {email.status === "sent" ? "verzonden" : "aan het verzenden"}.
          {email.recipientCount && ` (${email.recipientCount} ontvangers)`}
        </div>
      )}

      {showSendPanel && !isReadOnly && (
        <div className="mb-6 border border-[#1a1a1a]/15 bg-[#fffef9] p-6">
          <h3 className="mb-4 font-[family-name:var(--font-playfair)] text-xl font-semibold">
            Versturen
          </h3>

          <div className="mb-6">
            <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-[#888]">
              Test verzenden
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testAddress}
                onChange={(e) => setTestAddress(e.target.value)}
                placeholder="test@example.com"
                className="flex-1 border border-[#1a1a1a]/20 bg-white px-3 py-2 text-sm focus:border-[#1a1a1a] focus:outline-none"
              />
              <button
                onClick={handleTestSend}
                disabled={sending || !testAddress}
                className="border border-[#1a1a1a]/20 px-4 py-2 text-sm hover:bg-white disabled:opacity-50"
              >
                Test
              </button>
            </div>
          </div>

          <AudienceFilterPanel
            initialFilter={email.audienceFilter}
            onSend={handleSendToAudience}
            sending={sending}
          />
        </div>
      )}

      <div className="border border-[#1a1a1a]/15 bg-white min-h-[500px]">
        <EmailEditor
          ref={editorRef}
          content={email.editorHtml}
          editable={!isReadOnly}
        />
      </div>
    </AdminShell>
  );
}
