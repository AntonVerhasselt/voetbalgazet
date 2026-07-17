import type { ReactNode } from "react";

export function PreviewArticleGate({
  lead,
  children,
}: {
  lead: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="preview-gate">
      <div className="article-lead">{lead}</div>
      <div className="preview-gate__locked" aria-label="Preview van de e-mailgate">
        <p className="eyebrow">Preview · e-mailgate</p>
        <h2>Lees verder langs de lijn</h2>
        <p>
          In productie verschijnt hier de inschrijving. Er wordt in preview
          geen subscriberdata geladen of analytics verstuurd.
        </p>
      </div>
      <div className="preview-gate__content" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
