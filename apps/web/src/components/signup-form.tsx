"use client";

import { useState, type FormEvent } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

type FormStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

export function SignupForm() {
  const [status, setStatus] = useState<FormStatus>({ state: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const website = String(formData.get("website") ?? "");
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
      setStatus({
        state: "error",
        message: "Inschrijven is nog niet geconfigureerd. Probeer later opnieuw.",
      });
      return;
    }

    setStatus({ state: "submitting" });

    try {
      const client = new ConvexHttpClient(convexUrl);
      await client.mutation(api.subscribers.startSignup, { email, website });
      form.reset();
      setStatus({
        state: "success",
        message:
          "Je aanmelding is gestart. We vragen je voorkeuren zodra de inschrijvingen openen.",
      });
    } catch {
      setStatus({
        state: "error",
        message: "Dat lukte niet. Controleer je e-mailadres en probeer opnieuw.",
      });
    }
  }

  return (
    <form className="signup-form" onSubmit={handleSubmit}>
      <label htmlFor="signup-email">E-mailadres</label>
      <div className="signup-form__row">
        <input
          id="signup-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          placeholder="jij@voorbeeld.be"
          required
        />
        <button type="submit" disabled={status.state === "submitting"}>
          {status.state === "submitting" ? "Even geduld…" : "Start inschrijving"}
        </button>
      </div>
      <div className="signup-form__honeypot" aria-hidden="true">
        <label htmlFor="signup-website">Website</label>
        <input
          id="signup-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <p
        className={`signup-form__status signup-form__status--${status.state}`}
        aria-live="polite"
      >
        {"message" in status ? status.message : "Geen spam. Wel voetbal van dichtbij."}
      </p>
    </form>
  );
}
