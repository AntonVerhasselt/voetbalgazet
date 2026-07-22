"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { pipelineApi } from "@/lib/pipeline-api";

const MAX_QUESTIONS = 8;

type Props = {
  articleContactId: Id<"pipelineArticleContacts">;
  initialQuestions: string[];
  canEdit: boolean;
  disabled?: boolean;
};

export function InterviewQuestionsEditor({
  articleContactId,
  initialQuestions,
  canEdit,
  disabled = false,
}: Props) {
  const updateQuestions = useMutation(pipelineApi.updateIntervieweeQuestions);
  const [draft, setDraft] = useState<string[]>(initialQuestions);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const questionsKey = initialQuestions.join("\u0001");
  useEffect(() => {
    setDraft(initialQuestions);
  }, [articleContactId, questionsKey, initialQuestions]);

  async function persist(next: string[]) {
    if (!canEdit || disabled) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateQuestions({
        articleContactId,
        questions: next,
      });
      setDraft(result.questions);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kon vragen niet opslaan.",
      );
      setDraft(initialQuestions);
    } finally {
      setSaving(false);
    }
  }

  function updateLocal(index: number, value: string) {
    setDraft((prev) => prev.map((q, i) => (i === index ? value : q)));
  }

  async function commitBlur(index: number) {
    const next = draft
      .map((q, i) => (i === index ? q.trim() : q.trim()))
      .filter((q) => q.length > 0);
    const same =
      next.length === initialQuestions.length &&
      next.every((q, i) => q === initialQuestions[i]);
    if (same) {
      setDraft(initialQuestions);
      return;
    }
    await persist(next);
  }

  async function removeAt(index: number) {
    const next = draft.filter((_, i) => i !== index);
    setDraft(next);
    await persist(next);
  }

  async function addQuestion() {
    if (draft.length >= MAX_QUESTIONS) return;
    const next = [...draft, ""];
    setDraft(next);
    // Don't persist empty yet — wait for blur/edit.
  }

  if (!canEdit) {
    if (initialQuestions.length === 0) {
      return (
        <p className="pipeline-questions__empty">Geen interviewvragen.</p>
      );
    }
    return (
      <ol className="pipeline-questions__list">
        {initialQuestions.map((question, index) => (
          <li key={`${index}-${question}`}>{question}</li>
        ))}
      </ol>
    );
  }

  return (
    <div className="pipeline-questions">
      <div className="pipeline-questions__header">
        <h4>Interviewvragen</h4>
        <span className="pipeline-questions__count">
          {draft.filter((q) => q.trim()).length}/{MAX_QUESTIONS}
        </span>
      </div>

      {draft.length === 0 ? (
        <p className="pipeline-questions__empty">
          Nog geen vragen. Voeg er minstens één toe voor het interview.
        </p>
      ) : (
        <ul className="pipeline-questions__editor">
          {draft.map((question, index) => (
            <li key={`q-${articleContactId}-${index}`}>
              <label className="pipeline-questions__field">
                <span className="pipeline-questions__index">{index + 1}</span>
                <textarea
                  className="pipeline-questions__input"
                  rows={2}
                  value={question}
                  disabled={disabled || saving}
                  onChange={(e) => updateLocal(index, e.target.value)}
                  onBlur={() => void commitBlur(index)}
                  placeholder="Typ een interviewvraag…"
                  aria-label={`Interviewvraag ${index + 1}`}
                />
              </label>
              <button
                type="button"
                className="newsletter-action-btn pipeline-questions__remove"
                disabled={disabled || saving}
                onClick={() => void removeAt(index)}
              >
                Verwijder
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="newsletter-action-btn pipeline-questions__add"
        disabled={disabled || saving || draft.length >= MAX_QUESTIONS}
        onClick={() => void addQuestion()}
      >
        Vraag toevoegen
      </button>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {saving ? (
        <p className="pipeline-questions__saving" role="status">
          Opslaan…
        </p>
      ) : null}
    </div>
  );
}
