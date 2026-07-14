"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { AdminShell } from "@/components/AdminShell";
import { Id } from "@convex/_generated/dataModel";

type EmailStatus = "draft" | "sending" | "sent" | "failed";

const statusLabels: Record<EmailStatus, string> = {
  draft: "Concept",
  sending: "Verzenden...",
  sent: "Verzonden",
  failed: "Mislukt",
};

const statusColors: Record<EmailStatus, string> = {
  draft: "bg-amber-50 text-amber-800 border-amber-200",
  sending: "bg-blue-50 text-blue-800 border-blue-200",
  sent: "bg-green-50 text-green-800 border-green-200",
  failed: "bg-red-50 text-red-800 border-red-200",
};

export default function NewsletterListPage() {
  const emails = useQuery(api.newsletterEmails.list, {});
  const createEmail = useMutation(api.newsletterEmails.create);
  const duplicateEmail = useMutation(api.newsletterEmails.duplicate);
  const removeEmail = useMutation(api.newsletterEmails.remove);
  const seedCatalog = useMutation(api.catalog.seedCatalog);
  const seedSubscribers = useMutation(api.catalog.seedDemoSubscribers);

  const handleCreate = async () => {
    const id = await createEmail({
      name: `Nieuwsbrief ${new Date().toLocaleDateString("nl-BE")}`,
    });
    window.location.href = `/admin/newsletter/${id}`;
  };

  const handleDuplicate = async (emailId: Id<"newsletterEmails">) => {
    const newId = await duplicateEmail({ emailId });
    window.location.href = `/admin/newsletter/${newId}`;
  };

  const handleDelete = async (emailId: Id<"newsletterEmails">) => {
    if (confirm("Weet je zeker dat je dit concept wilt verwijderen?")) {
      await removeEmail({ emailId });
    }
  };

  const handleSeed = async () => {
    await seedCatalog({});
    await seedSubscribers({});
  };

  return (
    <AdminShell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold">
            Nieuwsbrieven
          </h2>
          <p className="mt-1 text-sm text-[#666]">
            Maak, bewerk en verstuur nieuwsbrieven naar je abonnees.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSeed}
            className="border border-[#1a1a1a]/20 bg-white px-4 py-2 text-sm hover:bg-[#faf8f4] transition-colors"
          >
            Demo data laden
          </button>
          <button
            onClick={handleCreate}
            className="bg-[#1a1a1a] px-4 py-2 text-sm text-white hover:bg-[#333] transition-colors"
          >
            Nieuwe nieuwsbrief
          </button>
        </div>
      </div>

      {!emails ? (
        <p className="text-[#666]">Laden...</p>
      ) : emails.length === 0 ? (
        <div className="border border-dashed border-[#1a1a1a]/20 bg-[#fffef9] p-12 text-center">
          <p className="text-[#666]">Nog geen nieuwsbrieven. Maak je eerste aan.</p>
        </div>
      ) : (
        <div className="border border-[#1a1a1a]/15 bg-[#fffef9]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a]/10 font-mono text-[11px] uppercase tracking-wider text-[#888]">
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Onderwerp</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ontvangers</th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr
                  key={email._id}
                  className="border-b border-[#1a1a1a]/5 hover:bg-[#faf8f4] transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/newsletter/${email._id}`}
                      className="font-medium hover:underline"
                    >
                      {email.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#555]">{email.subject}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block border px-2 py-0.5 text-xs font-mono ${statusColors[email.status]}`}
                    >
                      {statusLabels[email.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#666]">
                    {email.recipientCount ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#666]">
                    {email.sentAt
                      ? new Date(email.sentAt).toLocaleDateString("nl-BE")
                      : new Date(email.updatedAt).toLocaleDateString("nl-BE")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleDuplicate(email._id)}
                        className="text-xs text-[#666] hover:text-[#1a1a1a]"
                      >
                        Dupliceren
                      </button>
                      {email.status === "draft" && (
                        <button
                          onClick={() => handleDelete(email._id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Verwijderen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
