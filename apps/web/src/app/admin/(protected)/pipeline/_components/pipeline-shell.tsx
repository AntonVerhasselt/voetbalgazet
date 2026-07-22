"use client";

import { PipelineDivisionProvider } from "./pipeline-division-context";
import { ReeksSelector } from "./reeks-selector";
import { PhaseStrip } from "./phase-strip";

export function PipelineShell({
  canEdit,
  children,
}: {
  canEdit: boolean;
  children: React.ReactNode;
}) {
  return (
    <PipelineDivisionProvider canEdit={canEdit}>
      <header className="admin-page-heading">
        <p className="eyebrow">Redactie</p>
        <h1>Pipeline</h1>
        <p>Van idee tot publicatie, per reeks.</p>
      </header>

      <div className="pipeline-toolbar">
        <ReeksSelector />
        <PhaseStrip />
      </div>

      <div className="pipeline-body">{children}</div>
    </PipelineDivisionProvider>
  );
}
