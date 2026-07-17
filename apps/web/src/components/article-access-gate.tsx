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

function restoreScrollPosition(scrollY: number): void {
  // Two-arg form stays instant even when html has scroll-behavior: smooth.
  window.scrollTo(0, scrollY);
}

export function ArticleAccessGate({
  articleId,
  leadLength,
  preview,
  children,
}: {
  articleId: string;
  leadLength: number;
  preview: ReactNode;
  children: ReactNode;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [locallyUnlocked, setLocallyUnlocked] = useState(false);
  const [signupStep, setSignupStep] = useState<
    "email" | "preferences" | "success"
  >("email");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const impressionCaptured = useRef(false);
  const sessionCaptured = useRef(false);
  const sessionCheckStartedAt = useRef<number | null>(null);
  const lockedScrollY = useRef(0);
  const didLockScroll = useRef(false);
  // Soft gate: any Better Auth session (anonymous reader after signup, or
  // verified) unlocks. Technical bypass of soft HTML remains acceptable per
  // Phase 2 plan; the sheet itself must stay mandatory until then.
  const unlocked = Boolean(session?.user) || locallyUnlocked;

  useEffect(() => {
    if (sessionCheckStartedAt.current === null) {
      sessionCheckStartedAt.current = performance.now();
    }
  }, []);

  useEffect(() => {
    if (isPending || sessionCaptured.current) {
      return;
    }
    sessionCaptured.current = true;
    const startedAt = sessionCheckStartedAt.current ?? performance.now();
    capturePublicEvent("auth_session_check_completed", {
      access_level: unlocked ? "reader" : "none",
      duration_bucket: bucketDurationMs(performance.now() - startedAt),
    });
  }, [isPending, unlocked]);

  useEffect(() => {
    if (isPending || unlocked) {
      return;
    }
    if (!impressionCaptured.current) {
      impressionCaptured.current = true;
      capturePublicEvent("gate_impression", {
        article_id: articleId,
        gate_variant: "mandatory_sheet_v1",
        lead_length: leadLength,
      });
    }

    lockedScrollY.current = window.scrollY;
    didLockScroll.current = true;
    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarGap = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${lockedScrollY.current}px`;
    body.style.width = "100%";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }

    headingRef.current?.focus({ preventScroll: true });

    return () => {
      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      body.style.paddingRight = previousPaddingRight;
      restoreScrollPosition(lockedScrollY.current);
      // Re-apply after paint in case focus/layout shifts the viewport.
      requestAnimationFrame(() => {
        restoreScrollPosition(lockedScrollY.current);
      });
    };
  }, [articleId, isPending, leadLength, unlocked]);

  useEffect(() => {
    if (!unlocked || !didLockScroll.current) {
      return;
    }
    restoreScrollPosition(lockedScrollY.current);
    requestAnimationFrame(() => {
      restoreScrollPosition(lockedScrollY.current);
    });
  }, [unlocked]);

  function keepFocusInside(event: KeyboardEvent<HTMLDivElement>): void {
    // Mandatory sheet: Escape must not dismiss (plans/public-news-site UX).
    if (event.key === "Escape") {
      event.preventDefault();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }

    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) {
      return;
    }
    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus({ preventScroll: true });
    }
  }

  function unlock(): void {
    setLocallyUnlocked(true);
    capturePublicEvent("article_body_unlocked", {
      article_id: articleId,
      unlock_source: "signup",
      access_level: "reader",
    });
  }

  return (
    <div
      className={`article-access article-access--${
        isPending ? "checking" : unlocked ? "unlocked" : "locked"
      }`}
    >
      <div className="article-lead">{preview}</div>
      {children}
      {isPending && (
        <div className="gate-placeholder" role="status">
          Leestoegang controleren…
        </div>
      )}
      {!isPending && !unlocked && (
        <div className="gate-layer">
          <div className="gate-layer__fade" aria-hidden="true" />
          <div
            className={`gate-sheet gate-sheet--${signupStep}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate-heading"
            onKeyDown={keepFocusInside}
          >
            <div className="gate-sheet__inner">
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
          </div>
        </div>
      )}
    </div>
  );
}
