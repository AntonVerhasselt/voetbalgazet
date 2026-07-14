"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.assign("/admin/inloggen");
        },
      },
    });
    setPending(false);
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
