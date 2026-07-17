"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AgentLoginForm() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);

    try {
      const response = await fetch("/api/admin/agent-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      if (response.status === 404) {
        setError("Ongeldige agenttoegang.");
        setPending(false);
        return;
      }

      if (response.status === 429) {
        setError("Te veel pogingen. Probeer later opnieuw.");
        setPending(false);
        return;
      }

      if (!response.ok) {
        setError("Ongeldige agenttoegang.");
        setPending(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Ongeldige agenttoegang.");
      setPending(false);
    }
  }

  return (
    <form className="admin-login__actions" onSubmit={onSubmit}>
      <label className="admin-field">
        <span className="admin-field__label">Toegangscode</span>
        <input
          className="admin-field__input"
          type="password"
          name="secret"
          autoComplete="current-password"
          required
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          disabled={pending}
        />
      </label>
      <button className="admin-button" type="submit" disabled={pending}>
        {pending ? "Bezig…" : "Agent sessie starten"}
      </button>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
