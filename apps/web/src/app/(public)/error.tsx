"use client";

import Link from "next/link";
import { useEffect } from "react";
import { capturePublicEvent, capturePublicException } from "@/lib/analytics";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    capturePublicException(error, {
      error_code: "route_error",
      digest: error.digest ?? null,
    });
    capturePublicEvent("article_render_error", {
      error_code: "route_error",
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <main className="shell legal-page">
      <h1>Er ging iets mis</h1>
      <p>
        Deze pagina kon niet worden geladen. Probeer opnieuw of ga terug naar de
        voorpagina.
      </p>
      <p>
        <button type="button" className="signup-form__primary" onClick={reset}>
          Opnieuw proberen
        </button>
      </p>
      <p>
        <Link className="text-link" href="/">
          Terug naar de homepage
        </Link>
      </p>
    </main>
  );
}
