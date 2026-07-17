"use client";

import NextError from "next/error";
import { useEffect } from "react";
import { capturePublicException } from "@/lib/analytics";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    capturePublicException(error, {
      error_code: "global_error",
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <html lang="nl-BE">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
