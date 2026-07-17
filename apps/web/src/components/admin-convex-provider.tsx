"use client";

import {
  ConvexBetterAuthProvider,
  type AuthClient,
} from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { useMemo, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

export function AdminConvexProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!url) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL ontbreekt.");
    }
    return new ConvexReactClient(url);
  }, []);

  return (
    <ConvexBetterAuthProvider
      client={client}
      authClient={authClient as unknown as AuthClient}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
