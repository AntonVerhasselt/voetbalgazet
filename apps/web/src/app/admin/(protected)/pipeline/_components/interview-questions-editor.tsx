"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
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

function newQuestionId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDraft(questions: string[], idPrefix: string): DraftQuestion[] {
  return questions.map((text, index) => ({
    id: `${idPrefix}-q${index}`,
    text,
  }));
}

/** Keep stable row ids across saves when text still matches. */
function reconcileDraft(
  prev: DraftQuestion[],
  nextTexts: string[],
  idPrefix: string,
): DraftQuestion[] {
  const used = new Set<string>();
  return nextTexts.map((text) => {
    const match = prev.find((q) => !used.has(q.id) && q.text.trim() === text);
    if (match) {
      used.add(match.id);
      return { id: match.id, text };
    }
    return { id: newQuestionId(idPrefix), text };
  });
}

/** Grow a textarea so wrapped content is fully visible at the current width. */
function autoSize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
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
  const [savedFlash, setSavedFlash] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const focusNewIdRef = useRef<string | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeRafRef = useRef<number | null>(null);

  function sizeAllTextareas() {
    autoSize(notesRef.current);
    for (const node of textareaRefs.current.values()) {
      autoSize(node);
    }
  }

  /** Remeasure after layout/paint — needed when width or font-size changes. */
  function scheduleSizeAll() {
    if (sizeRafRef.current !== null) {
      cancelAnimationFrame(sizeRafRef.current);
    }
    sizeRafRef.current = requestAnimationFrame(() => {
      sizeAllTextareas();
      sizeRafRef.current = requestAnimationFrame(() => {
        sizeAllTextareas();
        sizeRafRef.current = null;
      });
    });
  }

  // Reset local drafts when the server-provided contact/questions change.
  // Adjust during render (React-recommended) instead of setState in an effect.
  const questionsKey = initialQuestions.join("\u0001");
  const syncKey = `${articleContactId}\u0001${questionsKey}\u0001${initialNotes}\u0001${idPrefix}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    setNotesDraft(initialNotes);
    setDraft(toDraft(initialQuestions, idPrefix));
  }

  useEffect(() => {
    scheduleSizeAll();
    // scheduleSizeAll only touches refs; omit from deps to avoid re-subscribe noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sizing helper is ref-stable
  }, [draft, notesDraft, canEdit]);

  useEffect(() => {
    const focusId = focusNewIdRef.current;
    if (!focusId) return;
    const node = textareaRefs.current.get(focusId);
    if (node) {
      node.focus();
      autoSize(node);
    }
    focusNewIdRef.current = null;
  }, [draft]);

  useEffect(() => {
    const root = rootRef.current;
    const onResize = () => scheduleSizeAll();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    let observer: ResizeObserver | null = null;
    if (root && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => scheduleSizeAll());
      observer.observe(root);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      observer?.disconnect();
      if (sizeRafRef.current !== null) cancelAnimationFrame(sizeRafRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only; sizing via refs
  }, []);

  function flashSaved() {
    setSavedFlash(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedFlash(false), 1400);
  }

  async function persistQuestions(
    nextTexts: string[],
    options?: { keepDraft?: DraftQuestion[] },
  ) {
    if (!canEdit || disabled) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateQuestions({
        articleContactId,
        questions: nextTexts,
      });
      setDraft((prev) =>
        reconcileDraft(options?.keepDraft ?? prev, result.questions, idPrefix),
      );
      flashSaved();
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
      flashSaved();
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
      .map((q) => q.text.trim())
      .filter((q) => q.length > 0);
    // Drop empty rows that aren't the one still being edited empty intentionally
    const current = draft.find((q) => q.id === id);
    if (current && current.text.trim() === "" && draft.length > 1) {
      const withoutEmpty = draft.filter(
        (q) => q.id !== id || q.text.trim().length > 0,
      );
      const texts = withoutEmpty.map((q) => q.text.trim()).filter(Boolean);
      const same =
        texts.length === initialQuestions.length &&
        texts.every((q, i) => q === initialQuestions[i]);
      if (!same) {
        setDraft(withoutEmpty.filter((q) => q.text.trim().length > 0));
        await persistQuestions(texts);
        return;
      }
    }

    const same =
      nextTexts.length === initialQuestions.length &&
      nextTexts.every((q, i) => q === initialQuestions[i]);
    if (same) {
      // Restore empty placeholders only if nothing changed server-side
      if (draft.some((q) => !q.text.trim()) && nextTexts.length > 0) {
        setDraft(toDraft(initialQuestions, idPrefix));
      }
      return;
    }
    await persistQuestions(nextTexts);
  }

  async function removeAt(id: string) {
    const next = draft.filter((q) => q.id !== id);
    setDraft(next);
    await persistQuestions(
      next.map((q) => q.text.trim()).filter(Boolean),
      { keepDraft: next },
    );
  }

  async function moveQuestion(id: string, direction: -1 | 1) {
    const index = draft.findIndex((q) => q.id === id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    setDraft(next);
    const texts = next.map((q) => q.text.trim()).filter(Boolean);
    // Only persist when all rows have text (avoid dropping empty new row mid-edit)
    if (texts.length === next.length) {
      await persistQuestions(texts, { keepDraft: next });
    }
  }

  function reorderByDrag(fromId: string, toId: string) {
    if (fromId === toId) return;
    const from = draft.findIndex((q) => q.id === fromId);
    const to = draft.findIndex((q) => q.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...draft];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    setDraft(next);
    const texts = next.map((q) => q.text.trim()).filter(Boolean);
    if (texts.length === next.length) {
      void persistQuestions(texts, { keepDraft: next });
    }
  }

  function onDragStart(e: DragEvent, id: string) {
    if (disabled || saving) {
      e.preventDefault();
      return;
    }
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    const row = (e.currentTarget as HTMLElement).closest(
      ".pipeline-q-row",
    ) as HTMLElement | null;
    if (row) {
      e.dataTransfer.setDragImage(row, 24, 24);
    }
  }

  function onDragOver(e: DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  }

  function onDrop(e: DragEvent, id: string) {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    setOverId(null);
    if (fromId) reorderByDrag(fromId, id);
  }

  function onDragEnd() {
    setDragId(null);
    setOverId(null);
  }

  function onRowKeyDown(e: KeyboardEvent, id: string) {
    if (disabled || saving) return;
    if (e.altKey && e.key === "ArrowUp") {
      e.preventDefault();
      void moveQuestion(id, -1);
    } else if (e.altKey && e.key === "ArrowDown") {
      e.preventDefault();
      void moveQuestion(id, 1);
    }
  }

  async function addQuestion() {
    if (draft.length >= MAX_QUESTIONS) return;
    const id = newQuestionId(idPrefix);
    focusNewIdRef.current = id;
    setDraft((prev) => [...prev, { id, text: "" }]);
  }

  const filledCount = draft.filter((q) => q.text.trim()).length;
  const statusLabel = saving
    ? "Opslaan…"
    : savedFlash
      ? "Opgeslagen"
      : null;

  if (!canEdit) {
    return (
      <div className="pipeline-questions" ref={rootRef}>
        <section className="pipeline-questions__panel">
          <header className="pipeline-questions__panel-head">
            <h4>Notities voor de interviewer</h4>
          </header>
          <p className="pipeline-questions__notes-read">
            {initialNotes || "Geen notities."}
          </p>
        </section>
        <section className="pipeline-questions__panel">
          <header className="pipeline-questions__panel-head">
            <h4>Interviewvragen</h4>
            <span className="pipeline-questions__count">
              {initialQuestions.length}
            </span>
          </header>
          {initialQuestions.length === 0 ? (
            <p className="pipeline-questions__empty">Geen interviewvragen.</p>
          ) : (
            <ol className="pipeline-questions__list">
              {initialQuestions.map((question, index) => (
                <li key={`${index}-${question}`}>{question}</li>
              ))}
            </ol>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="pipeline-questions" ref={rootRef}>
      <section className="pipeline-questions__panel">
        <header className="pipeline-questions__panel-head">
          <div>
            <label
              className="pipeline-questions__notes-label"
              htmlFor={`notes-${articleContactId}`}
            >
              Notities voor de interviewer
            </label>
            <p className="pipeline-questions__notes-hint">
              Wie is deze persoon, waarom interviewen, wat is het doel?
            </p>
          </div>
          {statusLabel ? (
            <span
              className={
                saving
                  ? "pipeline-questions__status pipeline-questions__status--busy"
                  : "pipeline-questions__status pipeline-questions__status--ok"
              }
              role="status"
            >
              {statusLabel}
            </span>
          ) : null}
        </header>
        <textarea
          id={`notes-${articleContactId}`}
          ref={(node) => {
            notesRef.current = node;
            if (node) {
              autoSize(node);
              scheduleSizeAll();
            }
          }}
          className="pipeline-questions__notes-input"
          rows={3}
          value={notesDraft}
          disabled={disabled || saving}
          onChange={(e) => {
            setNotesDraft(e.target.value);
            autoSize(e.currentTarget);
          }}
          onInput={(e) => autoSize(e.currentTarget)}
          onBlur={() => void persistNotes()}
          placeholder="Briefing: wie, waarom, doel van het gesprek…"
        />
      </section>

      <section className="pipeline-questions__panel">
        <header className="pipeline-questions__panel-head">
          <div>
            <h4>Interviewvragen</h4>
            <p className="pipeline-questions__notes-hint pipeline-questions__reorder-hint">
              Sleep om te herschikken, of gebruik de pijltjes.
            </p>
          </div>
          <span className="pipeline-questions__count" aria-live="polite">
            {filledCount}/{MAX_QUESTIONS}
          </span>
        </header>

        {draft.length === 0 ? (
          <div className="pipeline-questions__empty-state">
            <p>Nog geen vragen voor dit interview.</p>
            <button
              type="button"
              className="pipeline-questions__add"
              disabled={disabled || saving}
              onClick={() => void addQuestion()}
            >
              Eerste vraag toevoegen
            </button>
          </div>
        ) : (
          <ul className="pipeline-questions__editor" aria-label="Interviewvragen">
            {draft.map((question, index) => {
              const isDragging = dragId === question.id;
              const isOver = overId === question.id && dragId !== question.id;
              return (
                <li
                  key={question.id}
                  className={[
                    "pipeline-q-row",
                    isDragging ? "pipeline-q-row--dragging" : "",
                    isOver ? "pipeline-q-row--over" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(e) => onDragOver(e, question.id)}
                  onDrop={(e) => onDrop(e, question.id)}
                  onDragEnd={onDragEnd}
                  onKeyDown={(e) => onRowKeyDown(e, question.id)}
                >
                  <button
                    type="button"
                    className="pipeline-q-row__handle"
                    draggable={!disabled && !saving}
                    onDragStart={(e) => onDragStart(e, question.id)}
                    aria-label={`Versleep vraag ${index + 1}`}
                    title="Sleep om te herschikken"
                    disabled={disabled || saving}
                  >
                    <span className="pipeline-q-row__grip" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                  </button>

                  <span className="pipeline-q-row__index" aria-hidden="true">
                    {index + 1}
                  </span>

                  <textarea
                    ref={(node) => {
                      if (node) {
                        textareaRefs.current.set(question.id, node);
                        autoSize(node);
                        scheduleSizeAll();
                      } else {
                        textareaRefs.current.delete(question.id);
                      }
                    }}
                    className="pipeline-q-row__input"
                    rows={2}
                    value={question.text}
                    disabled={disabled || saving}
                    onChange={(e) => {
                      updateLocal(question.id, e.target.value);
                      autoSize(e.currentTarget);
                    }}
                    onInput={(e) => autoSize(e.currentTarget)}
                    onBlur={() => void commitBlur(question.id)}
                    placeholder="Typ een interviewvraag…"
                    aria-label={`Interviewvraag ${index + 1}`}
                  />

                  <div className="pipeline-q-row__actions">
                    <button
                      type="button"
                      className="pipeline-q-row__icon-btn"
                      disabled={disabled || saving || index === 0}
                      onClick={() => void moveQuestion(question.id, -1)}
                      aria-label={`Vraag ${index + 1} omhoog`}
                      title="Omhoog"
                    >
                      <span aria-hidden="true">↑</span>
                    </button>
                    <button
                      type="button"
                      className="pipeline-q-row__icon-btn"
                      disabled={
                        disabled || saving || index === draft.length - 1
                      }
                      onClick={() => void moveQuestion(question.id, 1)}
                      aria-label={`Vraag ${index + 1} omlaag`}
                      title="Omlaag"
                    >
                      <span aria-hidden="true">↓</span>
                    </button>
                    <button
                      type="button"
                      className="pipeline-q-row__icon-btn pipeline-q-row__icon-btn--danger"
                      disabled={disabled || saving}
                      onClick={() => void removeAt(question.id)}
                      aria-label={`Vraag ${index + 1} verwijderen`}
                      title="Verwijderen"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {draft.length > 0 ? (
          <button
            type="button"
            className="pipeline-questions__add"
            disabled={disabled || saving || draft.length >= MAX_QUESTIONS}
            onClick={() => void addQuestion()}
          >
            {draft.length >= MAX_QUESTIONS
              ? "Maximum bereikt (8)"
              : "+ Vraag toevoegen"}
          </button>
        ) : null}
      </section>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
