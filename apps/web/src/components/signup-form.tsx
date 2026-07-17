"use client";

import Link from "next/link";
import { useId, useMemo, useState, type FormEvent } from "react";
import { teamOptions } from "@convex/lib/preferenceCatalog";
import { DivisionSelector } from "@/components/division-selector";
import { authClient } from "@/lib/auth-client";
import { capturePublicEvent } from "@/lib/analytics";
import { CONSENT_VERSION } from "@/lib/site-config";

type FormStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

type SignupFormProps = {
  source?: "article_gate" | "homepage_inline";
  articleId?: string;
  onUnlocked?: () => void;
  onStepChange?: (step: "email" | "preferences" | "success") => void;
  variant?: "dark" | "paper";
};

async function postSignup(body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    error?: string;
    accepted?: true;
    flow?: "preferences" | "continue_reading";
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "Dat lukte niet. Probeer opnieuw.");
  }
  return payload;
}

async function startReaderSession(
  email: string,
): Promise<{
  sessionStarted: boolean;
  verificationLinkSent: boolean;
}> {
  const currentSession = await authClient.getSession();
  if (!currentSession.data) {
    const anonymousResult = await authClient.signIn.anonymous();
    if (anonymousResult.error) {
      return {
        sessionStarted: false,
        verificationLinkSent: false,
      };
    }
  }

  const callbackURL =
    typeof window === "undefined" ? "/" : window.location.pathname;
  const magicLinkResult = await authClient.signIn.magicLink({
    email,
    callbackURL,
  });
  return {
    sessionStarted: true,
    verificationLinkSent: !magicLinkResult.error,
  };
}

export function SignupForm({
  source = "homepage_inline",
  articleId,
  onUnlocked,
  onStepChange,
  variant = "dark",
}: SignupFormProps) {
  const inputId = useId();
  const emailStatusId = `${inputId}-email-status`;
  const [status, setStatus] = useState<FormStatus>({ state: "idle" });
  const [step, setStep] = useState<"email" | "preferences" | "success">(
    "email",
  );
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [teamQuery, setTeamQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  const availableTeams = useMemo(() => {
    const normalizedQuery = teamQuery.trim().toLocaleLowerCase("nl-BE");
    return teamOptions.filter(
      (team) =>
        team.divisionKeys.some((key) => selectedDivisions.includes(key)) &&
        (!normalizedQuery ||
          team.label.toLocaleLowerCase("nl-BE").includes(normalizedQuery)),
    );
  }, [selectedDivisions, teamQuery]);

  function validateEmailStep(): string | null {
    const normalizedEmail = email.trim();
    if (
      !normalizedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalizedEmail)
    ) {
      setStatus({
        state: "error",
        message: "Vul een geldig e-mailadres in om verder te gaan.",
      });
      capturePublicEvent("gate_email_rejected", {
        article_id: articleId,
        source,
        reason: "invalid_email",
      });
      return null;
    }
    return normalizedEmail;
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = validateEmailStep();
    if (!normalizedEmail) {
      return;
    }
    setStatus({ state: "submitting" });
    capturePublicEvent("gate_email_submitted", {
      article_id: articleId,
      source,
    });

    try {
      const result = (await postSignup({
        action: "begin",
        email: normalizedEmail,
        website,
      })) as { flow: "preferences" | "continue_reading" };
      if (result.flow === "preferences") {
        setStep("preferences");
        onStepChange?.("preferences");
        setStatus({ state: "idle" });
        capturePublicEvent("preferences_step_viewed", { source });
        return;
      }

      await postSignup({
        action: "returning",
        email: normalizedEmail,
        website,
      });
      const { sessionStarted, verificationLinkSent } =
        await startReaderSession(normalizedEmail);
      setStep("success");
      onStepChange?.("success");
      setStatus({
        state: "success",
        message: sessionStarted
          ? verificationLinkSent
            ? "Je kunt verder lezen. Als dit adres al bij ons bekend is, ontvang je ook een veilige bevestigingslink."
            : "Je kunt verder lezen. De bevestigingsmail kon niet worden verstuurd; probeer die later opnieuw via Voorkeuren."
          : "Je kunt nu verder lezen. We konden je toegang op dit apparaat nog niet bewaren.",
      });
      capturePublicEvent("subscription_succeeded", {
        article_id: articleId,
        source,
        access_level: sessionStarted ? "reader" : "temporary_reader",
        is_returning_flow: true,
      });
      onUnlocked?.();
    } catch (error) {
      setStatus({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "Dat lukte niet. Controleer je e-mailadres en probeer opnieuw.",
      });
      capturePublicEvent("subscription_failed", {
        article_id: articleId,
        source,
        error_code: "email_step_failed",
        step: "email",
      });
    }
  }

  async function handleReturningReader(): Promise<void> {
    const normalizedEmail = validateEmailStep();
    if (!normalizedEmail) {
      return;
    }
    setStatus({ state: "submitting" });
    capturePublicEvent("gate_email_submitted", {
      article_id: articleId,
      source,
      is_returning_flow: true,
    });

    try {
      await postSignup({
        action: "returning",
        email: normalizedEmail,
        website,
      });
      const { sessionStarted, verificationLinkSent } =
        await startReaderSession(normalizedEmail);
      setStep("success");
      onStepChange?.("success");
      setStatus({
        state: "success",
        message: sessionStarted
          ? verificationLinkSent
            ? "Je kunt verder lezen. Als dit adres al bij ons bekend is, ontvang je ook een veilige bevestigingslink."
            : "Je kunt verder lezen. De bevestigingsmail kon niet worden verstuurd; probeer die later opnieuw via Voorkeuren."
          : "Je kunt nu verder lezen. We konden je toegang op dit apparaat nog niet bewaren.",
      });
      capturePublicEvent("subscription_succeeded", {
        article_id: articleId,
        source,
        access_level: sessionStarted ? "reader" : "temporary_reader",
        is_returning_flow: true,
      });
      onUnlocked?.();
    } catch (error) {
      setStatus({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "Dat lukte niet. Controleer je e-mailadres en probeer opnieuw.",
      });
      capturePublicEvent("subscription_failed", {
        article_id: articleId,
        source,
        error_code: "returning_step_failed",
        step: "email",
      });
    }
  }

  function toggleDivision(key: string): void {
    setSelectedDivisions((current) => {
      const next = current.includes(key)
        ? current.filter((divisionKey) => divisionKey !== key)
        : [...current, key];
      const selectedTeamOption = teamOptions.find(
        (team) => team.key === selectedTeam,
      );
      if (
        selectedTeamOption &&
        !selectedTeamOption.divisionKeys.some((divisionKey) =>
          next.includes(divisionKey),
        )
      ) {
        setSelectedTeam("");
      }
      capturePublicEvent("division_selected", {
        division: key,
        selected_count: next.length,
      });
      return next;
    });
  }

  async function handlePreferencesSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (selectedDivisions.length === 0) {
      setStatus({
        state: "error",
        message: "Kies minstens één reeks om verder te gaan.",
      });
      return;
    }
    setStatus({ state: "submitting" });
    capturePublicEvent("subscription_submitted", {
      article_id: articleId,
      source,
      division_count: selectedDivisions.length,
      has_team: Boolean(selectedTeam),
      consent_version: CONSENT_VERSION,
    });

    try {
      await postSignup({
        action: "complete",
        source,
        email: email.trim(),
        website,
        divisionKeys: selectedDivisions,
        ...(selectedTeam ? { teamKey: selectedTeam } : {}),
      });
      const { sessionStarted, verificationLinkSent } =
        await startReaderSession(email.trim());
      setStep("success");
      onStepChange?.("success");
      setStatus({
        state: "success",
        message: sessionStarted
          ? verificationLinkSent
            ? "Welkom bij De Voetbalgazet. Je kunt meteen verder lezen; je veilige bevestigingslink is onderweg."
            : "Welkom bij De Voetbalgazet. Je kunt meteen verder lezen; de bevestigingsmail kon nog niet worden verstuurd."
          : "Je inschrijving is opgeslagen en je kunt nu verder lezen. We konden je toegang op dit apparaat nog niet bewaren.",
      });
      capturePublicEvent("subscription_succeeded", {
        article_id: articleId,
        source,
        access_level: sessionStarted ? "reader" : "temporary_reader",
        is_returning_flow: false,
      });
      onUnlocked?.();
    } catch (error) {
      setStatus({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "Je inschrijving kon niet worden afgerond. Probeer opnieuw.",
      });
      capturePublicEvent("subscription_failed", {
        article_id: articleId,
        source,
        error_code: "preferences_step_failed",
        step: "preferences",
      });
    }
  }

  if (step === "success") {
    return (
      <div className="signup-form__success" role="status">
        <p className="eyebrow">Welkom</p>
        <p>{"message" in status ? status.message : "Je kunt verder lezen."}</p>
      </div>
    );
  }

  if (step === "preferences") {
    return (
      <form
        className={`signup-form signup-form--${variant}`}
        onSubmit={handlePreferencesSubmit}
      >
        <fieldset className="preference-fieldset">
          <legend>Kies minstens één reeks</legend>
          <DivisionSelector
            selected={selectedDivisions}
            onToggle={toggleDivision}
          />
        </fieldset>

        <div className="team-picker">
          <label htmlFor={`${inputId}-team-search`}>
            Favoriete club <span>(optioneel)</span>
          </label>
          <input
            id={`${inputId}-team-search`}
            type="search"
            value={teamQuery}
            onChange={(event) => {
              setTeamQuery(event.target.value);
              capturePublicEvent("team_search_used", {
                query_length: event.target.value.length,
                result_count: availableTeams.length,
              });
            }}
            placeholder={
              selectedDivisions.length
                ? "Zoek een club"
                : "Kies eerst een reeks"
            }
            disabled={selectedDivisions.length === 0}
          />
          {selectedDivisions.length > 0 && (
            <select
              aria-label="Kies je favoriete club"
              value={selectedTeam}
              onChange={(event) => {
                setSelectedTeam(event.target.value);
                if (event.target.value) {
                  capturePublicEvent("favorite_team_selected", {
                    team_id: event.target.value,
                  });
                }
              }}
            >
              <option value="">Geen favoriete club</option>
              {availableTeams.map((team) => (
                <option key={team.key} value={team.key}>
                  {team.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <p className="consent-copy">
          Door op <strong>‘Abonneer en lees verder’</strong> te klikken,
          abonneer je je op De Voetbalgazet. Je krijgt toegang tot alle
          artikels en ontvangt onze wekelijkse nieuwsbrief. Je kunt de
          nieuwsbrief op elk moment uitschrijven zonder je toegang tot de site
          te verliezen. Lees onze <Link href="/privacy">privacyverklaring</Link>{" "}
          en <Link href="/voorwaarden">voorwaarden</Link>.
        </p>

        <button
          className="signup-form__primary"
          type="submit"
          disabled={status.state === "submitting"}
        >
          {status.state === "submitting"
            ? "Even geduld…"
            : "Abonneer en lees verder"}
        </button>
        <p
          className={`signup-form__status signup-form__status--${status.state}`}
          aria-live="polite"
        >
          {"message" in status ? status.message : ""}
        </p>
      </form>
    );
  }

  return (
    <form
      className={`signup-form signup-form--${variant}`}
      onSubmit={handleEmailSubmit}
      noValidate
    >
      <label htmlFor={`${inputId}-email`}>E-mailadres</label>
      <div className="signup-form__row">
        <input
          id={`${inputId}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          placeholder="jij@voorbeeld.be"
          value={email}
          aria-invalid={status.state === "error" ? true : undefined}
          aria-describedby={emailStatusId}
          onFocus={() =>
            capturePublicEvent("gate_email_started", {
              article_id: articleId,
              source,
            })
          }
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button type="submit" disabled={status.state === "submitting"}>
          {status.state === "submitting" ? "Even geduld…" : "Ga verder"}
        </button>
      </div>
      <button
        className="signup-form__secondary"
        type="button"
        disabled={status.state === "submitting"}
        onClick={() => {
          void handleReturningReader();
        }}
      >
        Al abonnee? Lees verder
      </button>
      <div className="signup-form__honeypot" aria-hidden="true">
        <label htmlFor={`${inputId}-website`}>Website</label>
        <input
          id={`${inputId}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      <p
        id={emailStatusId}
        className={`signup-form__status signup-form__status--${status.state}`}
        aria-live="polite"
      >
        {"message" in status
          ? status.message
          : "Geen spam. Wel voetbal van dichtbij."}
      </p>
      <p className="signup-form__returning">
        Al abonnee? Vul hetzelfde e-mailadres in en lees meteen verder.
      </p>
    </form>
  );
}
