"use client";

import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AbonneesPage() {
  const [newsletterOnly, setNewsletterOnly] = useState(false);

  const { results, status, loadMore } = usePaginatedQuery(
    api.newsletterAdmin.listSubscribers,
    { newsletterOnly },
    { initialNumItems: 50 },
  );

  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">Beheer</p>
        <h1>Abonnees</h1>
        <p>Overzicht van alle geregistreerde abonnees.</p>
      </header>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          marginTop: "1.5rem",
        }}
      >
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.88rem" }}>
          <input
            type="checkbox"
            checked={newsletterOnly}
            onChange={(e) => setNewsletterOnly(e.target.checked)}
          />
          Alleen nieuwsbrief-abonnees
        </label>
        <span style={{ color: "var(--ink-muted)", fontSize: "0.82rem" }}>
          {results !== undefined ? `${results.length}+ geladen` : "Laden…"}
        </span>
      </div>

      <div className="newsletter-subscribers">
        {results === undefined ? (
          <p className="newsletter-list__empty">Laden…</p>
        ) : results.length === 0 ? (
          <p className="newsletter-list__empty">Geen abonnees gevonden.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>E-mailadres</th>
                <th>Nieuwsbrief</th>
                <th>Toegang</th>
                <th>Bezorging</th>
                <th>Voorkeuren</th>
                <th>Aangemeld</th>
              </tr>
            </thead>
            <tbody>
              {results.map((subscriber) => (
                <tr key={subscriber._id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                    {subscriber.maskedEmail}
                  </td>
                  <td>
                    <span
                      className={`newsletter-badge newsletter-badge--${subscriber.newsletterSubscribed ? "yes" : "no"}`}
                    >
                      {subscriber.newsletterSubscribed ? "Ja" : "Nee"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`newsletter-badge newsletter-badge--${subscriber.siteAccess ? "yes" : "no"}`}
                    >
                      {subscriber.siteAccess ? "Ja" : "Nee"}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                    {subscriber.emailDeliveryStatus}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                    {subscriber.preferenceStatus}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                    {formatDate(subscriber.signupStartedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {status === "CanLoadMore" && (
          <button
            className="admin-button newsletter-load-more"
            onClick={() => loadMore(50)}
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
