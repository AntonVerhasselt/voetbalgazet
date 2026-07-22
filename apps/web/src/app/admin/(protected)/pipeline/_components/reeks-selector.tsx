"use client";

import { usePipelineDivision } from "./pipeline-division-context";

export function ReeksSelector() {
  const { divisions, divisionKey, setDivisionKey, selectedDivision } =
    usePipelineDivision();

  if (divisions === undefined) {
    return (
      <div className="pipeline-reeks">
        <label className="pipeline-reeks__label" htmlFor="pipeline-reeks">
          Reeks
        </label>
        <select
          id="pipeline-reeks"
          className="pipeline-reeks__select"
          disabled
          aria-busy="true"
        >
          <option>Laden…</option>
        </select>
      </div>
    );
  }

  if (divisions.length === 0) {
    return (
      <div className="pipeline-reeks">
        <p className="pipeline-reeks__empty">Geen reeksen beschikbaar.</p>
      </div>
    );
  }

  const badge = selectedDivision?.ideaReviewCount ?? 0;

  return (
    <div className="pipeline-reeks">
      <label className="pipeline-reeks__label" htmlFor="pipeline-reeks">
        Reeks
      </label>
      <div className="pipeline-reeks__control">
        <select
          id="pipeline-reeks"
          className="pipeline-reeks__select"
          value={divisionKey ?? ""}
          onChange={(e) => setDivisionKey(e.target.value)}
        >
          {divisions.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
              {d.researchBusy ? " (bezig)" : ""}
            </option>
          ))}
        </select>
        <span
          className="pipeline-reeks__badge"
          title="Ideeën ter review"
          aria-label={`${badge} ideeën ter review`}
        >
          {badge}
        </span>
      </div>
    </div>
  );
}
