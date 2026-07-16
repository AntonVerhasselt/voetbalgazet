"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { teamOptions } from "@convex/lib/preferenceCatalog";
import { DivisionSelector } from "@/components/division-selector";
import { capturePublicEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

type Preferences = {
  divisionKeys: string[];
  teamKey: string | null;
  newsletterSubscribed: boolean;
};

export function PreferencesForm() {
  const [loading, setLoading] = useState(true);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [team, setTeam] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/reader/preferences", { cache: "no-store" }).then(
      async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setRequiresVerification(true);
          setLoading(false);
          return;
        }
        const data = (await response.json()) as Preferences;
        setDivisions(data.divisionKeys);
        setTeam(data.teamKey ?? "");
        setLoading(false);
        capturePublicEvent("preferences_viewed", {
          division_count: data.divisionKeys.length,
          has_team: Boolean(data.teamKey),
        });
      },
    );
    return () => {
      cancelled = true;
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
      <fieldset>
        <legend>Mijn reeksen</legend>
        <DivisionSelector selected={divisions} onToggle={toggleDivision} />
      </fieldset>
      <label>
        Favoriete club (optioneel)
        <select value={team} onChange={(event) => setTeam(event.target.value)}>
          <option value="">Geen favoriete club</option>
          {availableTeams.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={saving}>
        {saving ? "Opslaan…" : "Voorkeuren opslaan"}
      </button>
      <p aria-live="polite">{message}</p>
    </form>
  );
}
