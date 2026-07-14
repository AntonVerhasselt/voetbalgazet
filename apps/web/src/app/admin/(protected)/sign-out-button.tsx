"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.assign("/admin/inloggen");
          },
        },
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      className="admin-signout"
      type="button"
      disabled={pending}
      onClick={signOut}
    >
      {pending ? "Afmelden…" : "Afmelden"}
    </button>
  );
}
