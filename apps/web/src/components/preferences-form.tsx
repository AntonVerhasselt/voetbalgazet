"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { teamOptions } from "@convex/lib/preferenceCatalog";
import { DivisionSelector } from "@/components/division-selector";
import { TeamCombobox } from "@/components/team-combobox";
import { capturePublicEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

type Preferences = {
  divisionKeys: string[];
  teamKey: string | null;
  newsletterSubscribed: boolean;
};

export function PreferencesForm() {
  const teamInputId = useId();
  const [loading, setLoading] = useState(true);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [team, setTeam] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(true);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12_000);

    void fetch("/api/reader/preferences", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setRequiresVerification(true);
          setLoading(false);
          return;
        }
        const data = (await response.json()) as Preferences;
        setDivisions(data.divisionKeys);
        setTeam(data.teamKey ?? "");
        setNewsletterSubscribed(data.newsletterSubscribed);
        setLoading(false);
        capturePublicEvent("preferences_viewed", {
          division_count: data.divisionKeys.length,
          has_team: Boolean(data.teamKey),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setRequiresVerification(true);
        setLoading(false);
        setMessage(
          "Je sessie kon niet worden gecontroleerd. Vraag een nieuwe veilige link aan.",
        );
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  const availableTeams = useMemo(
    () =>
      teamOptions.filter((option) =>
        option.divisionKeys.some((key) => divisions.includes(key)),
      ),
    [divisions],
  );

  function toggleDivision(key: string): void {
    setDivisions((current) => {
      const next = current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key];
      const currentTeam = teamOptions.find((option) => option.key === team);
      if (
        currentTeam &&
        !currentTeam.divisionKeys.some((divisionKey) =>
          next.includes(divisionKey),
        )
      ) {
        setTeam("");
      }
      return next;
    });
  }

  async function requestVerification(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setSaving(true);
    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: "/voorkeuren",
    });
    setSaving(false);
    setMessage(
      result.error
        ? "De veilige link kon niet worden verstuurd. Probeer opnieuw."
        : "Als dit adres bij ons bekend is, ontvang je een veilige link.",
    );
  }

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (divisions.length === 0) {
      setMessage("Kies minstens één reeks.");
      return;
    }
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/reader/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        divisionKeys: divisions,
        ...(team ? { teamKey: team } : {}),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage("Je voorkeuren konden niet worden opgeslagen.");
      return;
    }
    setMessage("Je voorkeuren zijn opgeslagen.");
    capturePublicEvent("preferences_updated", {
      division_count: divisions.length,
      has_team: Boolean(team),
    });
  }

  async function resubscribeNewsletter(): Promise<void> {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/reader/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resubscribe_newsletter" }),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage("Opnieuw inschrijven voor de nieuwsbrief lukte niet.");
      return;
    }
    setNewsletterSubscribed(true);
    setMessage(
      "Je bent opnieuw ingeschreven voor de wekelijkse nieuwsbrief. Je website-toegang was en blijft ongewijzigd.",
    );
    capturePublicEvent("newsletter_resubscribed", {});
  }

  if (loading) {
    return <p role="status">Je veilige sessie controleren…</p>;
  }

  if (requiresVerification) {
    return (
      <form className="preferences-verify" onSubmit={requestVerification}>
        <h2>Open je voorkeuren via een veilige link</h2>
        <p>
          Alleen een bevestigd e-mailadres mag bestaande voorkeuren bekijken of
          wijzigen.
        </p>
        {message ? <p role="status">{message}</p> : null}
        <label>
          E-mailadres
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Even geduld…" : "Stuur mij een veilige link"}
        </button>
        <p aria-live="polite">{message}</p>
      </form>
    );
  }

  return (
    <form className="preferences-form" onSubmit={save}>
      <section className="preferences-newsletter-status" aria-live="polite">
        {newsletterSubscribed ? (
          <p>
            Nieuwsbrief: <strong>aan</strong>. Uitschrijven kan via de link in
            elke nieuwsbrief — dat stopt alleen de mail, niet je artikels-toegang.
          </p>
        ) : (
          <div>
            <p>
              Nieuwsbrief: <strong>uit</strong>. Je kunt nog steeds artikels
              lezen op de site.
            </p>
            <button
              type="button"
              className="signup-form__primary"
              disabled={saving}
              onClick={() => void resubscribeNewsletter()}
            >
              Schrijf me opnieuw in voor de wekelijkse nieuwsbrief
            </button>
          </div>
        )}
      </section>
      <fieldset>
        <legend>Mijn reeksen</legend>
        <DivisionSelector selected={divisions} onToggle={toggleDivision} />
      </fieldset>
      <div className="team-picker">
        <label htmlFor={teamInputId}>
          Favoriete club <span>(optioneel)</span>
        </label>
        <TeamCombobox
          id={teamInputId}
          options={availableTeams}
          value={team}
          onChange={setTeam}
          disabled={divisions.length === 0}
          placeholder="Zoek of kies een club"
          disabledPlaceholder="Kies eerst een reeks"
          maxResults={5}
        />
      </div>
      <button type="submit" disabled={saving}>
        {saving ? "Opslaan…" : "Voorkeuren opslaan"}
      </button>
      <p aria-live="polite">{message}</p>
    </form>
  );
}
