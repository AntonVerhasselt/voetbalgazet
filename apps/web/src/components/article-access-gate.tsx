"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { SignupForm } from "@/components/signup-form";
import { capturePublicEvent, bucketDurationMs } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { hasReaderAccess } from "@/lib/reader-access";

export function ArticleAccessGate({
  articleId,
  leadLength,
  preview,
  children,
  demoMode = false,
}: {
  articleId: string;
  leadLength: number;
  preview: ReactNode;
  children: ReactNode;
  /** Always show the gate (ignores reader session). For local UX demos only. */
  demoMode?: boolean;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [locallyUnlocked, setLocallyUnlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [signupStep, setSignupStep] = useState<
    "email" | "preferences" | "success"
  >("email");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);
  const impressionCaptured = useRef(false);
  const sessionCaptured = useRef(false);
  const sessionCheckStartedAt = useRef<number | null>(null);
  // Soft gate: only anonymous readers, verified e-mail sessions, or a fresh
  // local signup unlock the article body. Demo mode ignores existing sessions
  // so the gate always appears, but still unlocks after a local signup.
  const unlocked =
    locallyUnlocked || (!demoMode && hasReaderAccess(session?.user));
  const showGate = !unlocked && (demoMode || !isPending);

  useEffect(() => {
    if (sessionCheckStartedAt.current === null) {
      sessionCheckStartedAt.current = performance.now();
    }
  }, []);

  useEffect(() => {
    if (demoMode || isPending || sessionCaptured.current) {
      return;
    }
    sessionCaptured.current = true;
    const startedAt = sessionCheckStartedAt.current ?? performance.now();
    capturePublicEvent("auth_session_check_completed", {
      access_level: unlocked ? "reader" : "none",
      duration_bucket: bucketDurationMs(performance.now() - startedAt),
    });
  }, [demoMode, isPending, unlocked]);

  useEffect(() => {
    if (!showGate || dismissed || impressionCaptured.current) {
      return;
    }
    impressionCaptured.current = true;
    capturePublicEvent("gate_impression", {
      article_id: articleId,
      gate_variant: "inline_sheet_v1",
      lead_length: leadLength,
    });
    headingRef.current?.focus({ preventScroll: true });
  }, [articleId, dismissed, leadLength, showGate]);

  useEffect(() => {
    if (!dismissed) {
      return;
    }
    reopenRef.current?.focus({ preventScroll: true });
  }, [dismissed]);

  function dismiss(): void {
    setDismissed(true);
    capturePublicEvent("gate_dismissed", {
      article_id: articleId,
      gate_variant: "inline_sheet_v1",
      signup_step: signupStep,
    });
  }

  function reopen(): void {
    setDismissed(false);
    capturePublicEvent("gate_reopened", {
      article_id: articleId,
      gate_variant: "inline_sheet_v1",
    });
  }

  function onGateKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      dismiss();
    }
  }

  function unlock(): void {
    setLocallyUnlocked(true);
    if (!demoMode) {
      capturePublicEvent("article_body_unlocked", {
        article_id: articleId,
        unlock_source: "signup",
        access_level: "reader",
      });
    }
  }

  const accessState =
    !demoMode && isPending
      ? "checking"
      : unlocked
        ? "unlocked"
        : dismissed
          ? "dismissed"
          : "locked";

  return (
    <div className={`article-access article-access--${accessState}`}>
      <div className="article-lead">{preview}</div>
      {children}
      {!demoMode && isPending && (
        <div className="gate-placeholder" role="status">
          Leestoegang controleren…
        </div>
      )}
      {showGate && !dismissed && (
        <div className="gate-inline">
          <div className="gate-inline__fade" aria-hidden="true" />
          <section
            className={`gate-sheet gate-sheet--${signupStep}`}
            aria-labelledby="gate-heading"
            onKeyDown={onGateKeyDown}
          >
            <div className="gate-sheet__inner">
              <button
                className="gate-sheet__close"
                type="button"
                onClick={dismiss}
                aria-label="Sluit inschrijfformulier"
              >
                <span aria-hidden="true">×</span>
              </button>
              <p className="eyebrow">Gratis voor abonnees</p>
              <h2 id="gate-heading" ref={headingRef} tabIndex={-1}>
                {signupStep === "preferences"
                  ? "Kies jouw voetbal"
                  : "Abonneer om verder te lezen"}
              </h2>
              <p className="gate-sheet__intro">
                {signupStep === "preferences"
                  ? "Selecteer reeksen in één of meer provincies en eventueel je favoriete club."
                  : "Dit artikel is gratis, maar je hebt een abonnement op De Voetbalgazet nodig om het volledig te lezen. Eén e-mail per week — lokaal voetbal, geen ruis."}
              </p>
              <SignupForm
                source="article_gate"
                articleId={articleId}
                onUnlocked={unlock}
                onStepChange={setSignupStep}
                variant="paper"
              />
            </div>
          </section>
        </div>
      )}
      {showGate && dismissed && (
        <div className="gate-reopen">
          <p>Abonneer gratis om het volledige artikel te lezen.</p>
          <button ref={reopenRef} type="button" onClick={reopen}>
            Toon inschrijving
          </button>
        </div>
      )}
    </div>
  );
}
