"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";

type PreviewFrameProps = {
  articlePath: string;
  gateMode: "gated" | "ungated";
  children: ReactNode;
};

export function PreviewFrame({
  articlePath,
  gateMode,
  children,
}: PreviewFrameProps) {
  const [viewport, setViewport] = useState<"fluid" | "mobile360" | "mobile390">(
    "fluid",
  );
  return (
    <div className="preview-shell">
      <aside className="preview-toolbar" aria-label="Previewbediening">
        <strong>Conceptpreview</strong>
        <div role="group" aria-label="Viewport">
          <button
            type="button"
            aria-pressed={viewport === "mobile360"}
            onClick={() => setViewport("mobile360")}
          >
            Mobiel 360
          </button>
          <button
            type="button"
            aria-pressed={viewport === "mobile390"}
            onClick={() => setViewport("mobile390")}
          >
            Mobiel 390
          </button>
          <button
            type="button"
            aria-pressed={viewport === "fluid"}
            onClick={() => setViewport("fluid")}
          >
            Desktop
          </button>
        </div>
        <div role="group" aria-label="Artikelgate">
          <Link
            aria-current={gateMode === "gated" ? "true" : undefined}
            href={`${articlePath}?gate=gated`}
          >
            Gated
          </Link>
          <Link
            aria-current={gateMode === "ungated" ? "true" : undefined}
            href={`${articlePath}?gate=ungated`}
          >
            Volledig
          </Link>
        </div>
        <Link href="/keystatic">Terug naar Keystatic</Link>
        <form action="/preview/end" method="post">
          <button type="submit">Preview sluiten</button>
        </form>
      </aside>
      <div className={`preview-viewport preview-viewport--${viewport}`}>
        {children}
      </div>
    </div>
  );
}
