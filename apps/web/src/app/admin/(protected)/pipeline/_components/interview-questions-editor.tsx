"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { pipelineApi } from "@/lib/pipeline-api";

const MAX_QUESTIONS = 8;

type DraftQuestion = {
  id: string;
  text: string;
};

type Props = {
  articleContactId: Id<"pipelineArticleContacts">;
  initialNotes: string;
  initialQuestions: string[];
  canEdit: boolean;
  disabled?: boolean;
};

function toDraft(questions: string[], idPrefix: string): DraftQuestion[] {
  return questions.map((text, index) => ({
    id: `${idPrefix}-${index}-${text.slice(0, 24)}`,
    text,
  }));
}

export function InterviewQuestionsEditor({
  articleContactId,
  initialNotes,
  initialQuestions,
  canEdit,
  disabled = false,
}: Props) {
  const updateQuestions = useMutation(pipelineApi.updateIntervieweeQuestions);
  const updateNotes = useMutation(pipelineApi.updateIntervieweeNotes);
  const idPrefix = useId();
  const [notesDraft, setNotesDraft] = useState(initialNotes);
  const [draft, setDraft] = useState<DraftQuestion[]>(() =>
    toDraft(initialQuestions, idPrefix),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const focusNewIdRef = useRef<string | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const questionsKey = initialQuestions.join("\u0001");
  useEffect(() => {
    setNotesDraft(initialNotes);
    setDraft(toDraft(initialQuestions, idPrefix));
  }, [
    articleContactId,
    questionsKey,
    initialQuestions,
    initialNotes,
    idPrefix,
  ]);

  useEffect(() => {
    const focusId = focusNewIdRef.current;
    if (!focusId) return;
    const node = textareaRefs.current.get(focusId);
    if (node) {
      node.focus();
      node.select();
    }
    focusNewIdRef.current = null;
  }, [draft]);

  async function persistQuestions(nextTexts: string[]) {
    if (!canEdit || disabled) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateQuestions({
        articleContactId,
        questions: nextTexts,
      });
      setDraft(toDraft(result.questions, idPrefix));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kon vragen niet opslaan.",
      );
      setDraft(toDraft(initialQuestions, idPrefix));
    } finally {
      setSaving(false);
    }
  }

  async function persistNotes() {
    if (!canEdit || disabled) return;
    const next = notesDraft.trim();
    if (next === initialNotes.trim()) {
      setNotesDraft(initialNotes);
      return;
    }
    if (next.length === 0) {
      setError("Interviewnotities mag niet leeg zijn");
      setNotesDraft(initialNotes);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await updateNotes({
        articleContactId,
        interviewerNotes: next,
      });
      setNotesDraft(result.interviewerNotes);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kon notities niet opslaan.",
      );
      setNotesDraft(initialNotes);
    } finally {
      setSaving(false);
    }
  }

  function updateLocal(id: string, value: string) {
    setDraft((prev) =>
      prev.map((q) => (q.id === id ? { ...q, text: value } : q)),
    );
  }

  async function commitBlur(id: string) {
    const nextTexts = draft
      .map((q) => (q.id === id ? q.text.trim() : q.text.trim()))
      .filter((q) => q.length > 0);
    const same =
      nextTexts.length === initialQuestions.length &&
      nextTexts.every((q, i) => q === initialQuestions[i]);
    if (same) {
      setDraft(toDraft(initialQuestions, idPrefix));
      return;
    }
    await persistQuestions(nextTexts);
  }

  async function removeAt(id: string) {
    const next = draft.filter((q) => q.id !== id);
    setDraft(next);
    await persistQuestions(next.map((q) => q.text.trim()).filter(Boolean));
  }

  async function addQuestion() {
    if (draft.length >= MAX_QUESTIONS) return;
    const id = `${idPrefix}-new-${Date.now()}`;
    focusNewIdRef.current = id;
    const next = [...draft, { id, text: "" }];
    setDraft(next);
  }

  if (!canEdit) {
    return (
      <div className="pipeline-questions">
        <div className="pipeline-questions__notes-block">
          <h4>Notities voor de interviewer</h4>
          <p className="pipeline-questions__notes-read">
            {initialNotes || "Geen notities."}
          </p>
        </div>
        <div className="pipeline-questions__header">
          <h4>Interviewvragen</h4>
        </div>
        {initialQuestions.length === 0 ? (
          <p className="pipeline-questions__empty">Geen interviewvragen.</p>
        ) : (
          <ol className="pipeline-questions__list">
            {initialQuestions.map((question, index) => (
              <li key={`${index}-${question}`}>{question}</li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  const filledCount = draft.filter((q) => q.text.trim()).length;

  return (
    <div className="pipeline-questions">
      <div className="pipeline-questions__notes-block">
        <label
          className="pipeline-questions__notes-label"
          htmlFor={`notes-${articleContactId}`}
        >
          Notities voor de interviewer
        </label>
        <p className="pipeline-questions__notes-hint">
          Wie is deze persoon, waarom interviewen we hem/haar, en wat is het
          doel van het gesprek?
        </p>
        <textarea
          id={`notes-${articleContactId}`}
          className="pipeline-questions__notes-input"
          rows={4}
          value={notesDraft}
          disabled={disabled || saving}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={() => void persistNotes()}
          placeholder="Briefing voor de interviewer…"
        />
      </div>

      <div className="pipeline-questions__header">
        <h4>Interviewvragen</h4>
        <span className="pipeline-questions__count">
          {filledCount}/{MAX_QUESTIONS}
        </span>
      </div>

      {draft.length === 0 ? (
        <p className="pipeline-questions__empty">
          Nog geen vragen. Voeg er minstens één toe voor het interview.
        </p>
      ) : (
        <ul className="pipeline-questions__editor">
          {draft.map((question, index) => (
            <li key={question.id}>
              <label className="pipeline-questions__field">
                <span className="pipeline-questions__index">{index + 1}</span>
                <textarea
                  ref={(node) => {
                    if (node) textareaRefs.current.set(question.id, node);
                    else textareaRefs.current.delete(question.id);
                  }}
                  className="pipeline-questions__input"
                  rows={2}
                  value={question.text}
                  disabled={disabled || saving}
                  onChange={(e) => updateLocal(question.id, e.target.value)}
                  onBlur={() => void commitBlur(question.id)}
                  placeholder="Typ een interviewvraag…"
                  aria-label={`Interviewvraag ${index + 1}`}
                />
              </label>
              <button
                type="button"
                className="newsletter-action-btn pipeline-questions__remove"
                disabled={disabled || saving}
                onClick={() => void removeAt(question.id)}
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
