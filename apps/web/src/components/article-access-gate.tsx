"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { SignupForm } from "@/components/signup-form";
import { capturePublicEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

export function ArticleAccessGate({
  articleId,
  leadLength,
  children,
}: {
  articleId: string;
  leadLength: number;
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
  const unlocked = Boolean(session?.user) || locallyUnlocked;

  useEffect(() => {
    if (isPending || sessionCaptured.current) {
      return;
    }
    sessionCaptured.current = true;
    capturePublicEvent("auth_session_check_completed", {
      access_level: unlocked ? "reader" : "none",
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    headingRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [articleId, isPending, leadLength, unlocked]);

  function keepFocusInside(event: KeyboardEvent<HTMLDivElement>): void {
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
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
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
