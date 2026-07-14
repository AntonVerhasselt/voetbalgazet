"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ backendConfigured }: { backendConfigured: boolean }) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function signInWithGitHub() {
    setPending(true);
    setError(undefined);

    const result = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/admin/claim",
    });

    if (result.error) {
      setPending(false);
      setError("Aanmelden via GitHub is niet gelukt. Probeer opnieuw.");
    }
  }

  return (
    <div className="admin-login__actions">
      <button
        className="admin-button"
        type="button"
        disabled={!backendConfigured || pending}
        onClick={signInWithGitHub}
      >
        {pending ? "Doorsturen…" : "Aanmelden met GitHub"}
      </button>
      {!backendConfigured ? (
        <p className="admin-notice" role="status">
          De Convex-authomgeving is nog niet geconfigureerd.
        </p>
      ) : null}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
