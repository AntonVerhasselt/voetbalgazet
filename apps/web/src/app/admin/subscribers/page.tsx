"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AdminShell } from "@/components/AdminShell";

export default function SubscribersPage() {
  const subscribers = useQuery(api.subscribers.list, {});

  return (
    <AdminShell>
      <div className="mb-8">
        <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold">
          Abonnees
        </h2>
        <p className="mt-1 text-sm text-[#666]">
          Overzicht van alle ingeschreven lezers en hun voorkeuren.
        </p>
      </div>

      {!subscribers ? (
        <p className="text-[#666]">Laden...</p>
      ) : subscribers.length === 0 ? (
        <div className="border border-dashed border-[#1a1a1a]/20 bg-[#fffef9] p-12 text-center">
          <p className="text-[#666]">Nog geen abonnees. Laad demo data via de nieuwsbriefpagina.</p>
        </div>
      ) : (
        <div className="border border-[#1a1a1a]/15 bg-[#fffef9]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a]/10 font-mono text-[11px] uppercase tracking-wider text-[#888]">
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Nieuwsbrief</th>
                <th className="px-4 py-3">Site toegang</th>
                <th className="px-4 py-3">Reeksen</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => (
                <tr
                  key={sub._id}
                  className="border-b border-[#1a1a1a]/5 hover:bg-[#faf8f4]"
                >
                  <td className="px-4 py-3 font-mono text-xs">{sub.normalizedEmail}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs ${sub.newsletterSubscribed ? "text-green-700" : "text-[#888]"}`}
                    >
                      {sub.newsletterSubscribed ? "Actief" : "Uitgeschreven"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#666]">
                    {sub.siteAccess ? "Ja" : "Nee"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#666]">
                    {sub.divisionIds.length} reeks(en)
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#666]">
                    {sub.emailDeliveryStatus}
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
