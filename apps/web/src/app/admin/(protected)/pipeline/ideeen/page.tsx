"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { pipelineApi } from "@/lib/pipeline-api";
import { usePipelineDivision } from "../_components/pipeline-division-context";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("nl-BE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleHint(proposals: string[]): string {
  if (!proposals.length) return "—";
  if (proposals.length === 1) return proposals[0]!;
  return `${proposals[0]} · +${proposals.length - 1}`;
}

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PipelineIdeeenPage() {
  const { canEdit, divisionKey, withReeksQuery, selectedDivision } =
    usePipelineDivision();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const ideas = useQuery(
    pipelineApi.listIdeas,
    divisionKey ? { divisionKey } : "skip",
  );
  const activeRun = useQuery(
    pipelineApi.getActiveResearchRun,
    divisionKey ? { divisionKey } : "skip",
  );
  const startResearchRun = useMutation(pipelineApi.startResearchRun);

  const researchBusy =
    selectedDivision?.researchBusy === true ||
    activeRun?.status === "queued" ||
    activeRun?.status === "running";

  async function handleGenerate() {
    if (!divisionKey || !canEdit || researchBusy) return;
    setStarting(true);
    setError(null);
    try {
      await startResearchRun({
        divisionKey,
        clientRequestId: newClientRequestId(),
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kon research niet starten.",
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <div className="pipeline-ideeen-toolbar">
        <button
          type="button"
          className="admin-button pipeline-generate-btn"
          onClick={handleGenerate}
          disabled={!canEdit || !divisionKey || researchBusy || starting}
          title={
            !canEdit
              ? "Alleen lezen"
              : researchBusy
                ? "Er loopt al research voor deze reeks"
                : undefined
          }
        >
          {researchBusy || starting
            ? "Bezig met research…"
            : "Genereer 5 ideeën"}
        </button>
        {researchBusy && (
          <span className="pipeline-busy" role="status">
            <span className="pipeline-busy__spinner" aria-hidden="true" />
            Bezig met research…
          </span>
        )}
      </div>

      {error && <p className="admin-error">{error}</p>}

      {activeRun?.status === "failed" && activeRun.errorMessage && (
        <p className="admin-error" role="alert">
          Laatste research mislukt: {activeRun.errorMessage}
        </p>
      )}

      {!canEdit && (
        <p className="admin-notice">
          Je hebt alleen leesrechten. Genereren en goedkeuren is niet
          beschikbaar.
        </p>
      )}

      {!divisionKey ? (
        <p className="pipeline-list__empty">Kies eerst een reeks.</p>
      ) : ideas === undefined ? (
        <p className="pipeline-list__empty">Laden…</p>
      ) : ideas.length === 0 ? (
        <p className="pipeline-list__empty">
          Geen ideeën ter review voor deze reeks. Genereer een batch om te
          starten.
        </p>
      ) : (
        <div className="admin-table-scroll">
          <table className="pipeline-list__table">
            <thead>
              <tr>
                <th>Ideetitel</th>
                <th>Titelvoorstellen</th>
                <th>Contacten</th>
                <th>Tijd</th>
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea) => (
                <tr key={idea._id}>
                  <td>
                    <Link
                      href={withReeksQuery(
                        `/admin/pipeline/${idea._id}`,
                      )}
                      className="pipeline-list__link"
                    >
                      {idea.ideaTitle}
                    </Link>
                  </td>
                  <td className="pipeline-list__hint">
                    {titleHint(idea.titleProposals)}
                  </td>
                  <td className="pipeline-list__contacts">
                    {idea.contactsSelected}/{idea.contactsTotal}
                  </td>
                  <td className="pipeline-list__time">
                    {formatTime(idea.updatedAt || idea.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
