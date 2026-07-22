"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { pipelineApi } from "@/lib/pipeline-api";
import { usePipelineDivision } from "../_components/pipeline-division-context";

const CONTACT_TYPE_LABELS: Record<string, string> = {
  player: "Speler",
  staff: "Staf",
  board: "Bestuur",
  other: "Andere",
};

export default function PipelineIdeaDetailPage() {
  const params = useParams<{ articleId: string }>();
  const articleId = params.articleId as Id<"pipelineArticles"> | undefined;
  const router = useRouter();
  const { canEdit, withReeksQuery } = usePipelineDivision();

  const detail = useQuery(
    pipelineApi.getIdeaDetail,
    articleId ? { articleId } : "skip",
  );
  const approveIdea = useMutation(pipelineApi.approveIdea);
  const rejectIdea = useMutation(pipelineApi.rejectIdea);
  const toggleSelected = useMutation(pipelineApi.toggleIntervieweeSelected);

  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "reject" | string | null>(
    null,
  );

  async function handleApprove() {
    if (!articleId || !canEdit) return;
    setBusy("approve");
    setError(null);
    try {
      await approveIdea({ articleId });
      router.push(withReeksQuery("/admin/pipeline/ideeen"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Goedkeuren mislukt.",
      );
      setBusy(null);
    }
  }

  async function handleReject() {
    if (!articleId || !canEdit) return;
    setBusy("reject");
    setError(null);
    try {
      await rejectIdea({
        articleId,
        reason: reason.trim() || undefined,
      });
      router.push(withReeksQuery("/admin/pipeline/ideeen"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Afwijzen mislukt.");
      setBusy(null);
    }
  }

  async function handleToggle(
    articleContactId: Id<"pipelineArticleContacts">,
    selected: boolean,
  ) {
    if (!canEdit) return;
    setBusy(articleContactId);
    setError(null);
    try {
      await toggleSelected({ articleContactId, selected: !selected });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Kon selectie niet wijzigen.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (detail === undefined) {
    return <p className="pipeline-list__empty">Laden…</p>;
  }

  if (detail === null) {
    return (
      <div className="pipeline-detail">
        <p className="admin-error">Idee niet gevonden.</p>
        <Link
          href={withReeksQuery("/admin/pipeline/ideeen")}
          className="newsletter-action-link"
        >
          Terug naar ideeën
        </Link>
      </div>
    );
  }

  const { article, contacts } = detail;
  const sortedContacts = [...contacts].sort(
    (a, b) => a.suggestedOrder - b.suggestedOrder,
  );
  const inIdeaReview = article.phase === "idea_review";

  return (
    <div className="pipeline-detail">
      <p className="pipeline-detail__back">
        <Link href={withReeksQuery("/admin/pipeline/ideeen")}>
          ← Terug naar ideeën
        </Link>
      </p>

      <h2 className="pipeline-detail__title">{article.ideaTitle}</h2>

      {!inIdeaReview && (
        <p className="admin-notice">
          Dit idee is niet meer in review (fase: {article.phase}).
        </p>
      )}

      <section className="pipeline-detail__section">
        <h3>Drie titelvoorstellen</h3>
        <ol className="pipeline-detail__titles">
          {article.titleProposals.map((title, i) => (
            <li key={`${i}-${title}`}>{title}</li>
          ))}
        </ol>
      </section>

      <section className="pipeline-detail__section">
        <h3>Waarom interessant</h3>
        <p>{article.whyInteresting}</p>
      </section>

      <section className="pipeline-detail__section">
        <h3>Ondersteunende feiten</h3>
        {article.supportingFacts.length === 0 ? (
          <p className="pipeline-detail__muted">Geen feiten beschikbaar.</p>
        ) : (
          <ul className="pipeline-detail__facts">
            {article.supportingFacts.map((fact, i) => (
              <li key={i}>
                <strong>{fact.claim}</strong>
                <span>{fact.evidence}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pipeline-detail__section">
        <h3>Interviewkandidaten</h3>
        {sortedContacts.length === 0 ? (
          <p className="pipeline-detail__muted">
            Geen kandidaten voorgesteld. Goedkeuren met 0 contacten mag.
          </p>
        ) : (
          <ul className="pipeline-detail__contacts">
            {sortedContacts.map((c) => (
              <li
                key={c.articleContactId}
                className={
                  c.selected
                    ? "pipeline-contact"
                    : "pipeline-contact pipeline-contact--off"
                }
              >
                <div className="pipeline-contact__meta">
                  <strong>{c.fullName}</strong>
                  <span>
                    {CONTACT_TYPE_LABELS[c.contactType] ?? c.contactType}
                    {c.contactTypeDetail ? ` · ${c.contactTypeDetail}` : ""}
                  </span>
                  <span>
                    {c.clubName}
                    {c.teamName ? ` · ${c.teamName}` : ""}
                  </span>
                  {c.whyInterview ? <p>{c.whyInterview}</p> : null}
                </div>
                <button
                  type="button"
                  className="newsletter-action-btn"
                  disabled={
                    !canEdit ||
                    !inIdeaReview ||
                    busy === c.articleContactId
                  }
                  onClick={() =>
                    handleToggle(c.articleContactId, c.selected)
                  }
                >
                  {c.selected ? "Niet interviewen" : "Interviewen"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="admin-error">{error}</p>}

      {canEdit && inIdeaReview ? (
        <div className="pipeline-detail__actions">
          <button
            type="button"
            className="admin-button pipeline-generate-btn"
            onClick={handleApprove}
            disabled={busy !== null}
          >
            {busy === "approve" ? "Bezig…" : "Idee goedkeuren"}
          </button>

          <div className="pipeline-reject">
            <label className="pipeline-reject__label" htmlFor="reject-reason">
              Reden (optioneel)
            </label>
            <textarea
              id="reject-reason"
              className="pipeline-reject__input"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optionele toelichting bij afwijzing"
              disabled={busy !== null}
            />
            <button
              type="button"
              className="newsletter-action-btn newsletter-action-btn--danger"
              onClick={handleReject}
              disabled={busy !== null}
            >
              {busy === "reject" ? "Bezig…" : "Idee afwijzen"}
            </button>
          </div>
        </div>
      ) : !canEdit ? (
        <p className="admin-notice">
          Je hebt alleen leesrechten. Goedkeuren of afwijzen is niet
          beschikbaar.
        </p>
      ) : null}
    </div>
  );
}
