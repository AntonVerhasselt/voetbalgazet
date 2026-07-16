"use client";

import { useMemo, useState } from "react";
import {
  divisionOptions,
  provinceOptions,
} from "@convex/lib/preferenceCatalog";

export function DivisionSelector({
  selected,
  onToggle,
}: {
  selected: readonly string[];
  onToggle: (key: string) => void;
}) {
  const [activeProvince, setActiveProvince] = useState<string>(
    provinceOptions[0]?.key ?? "antwerpen",
  );
  const activeDivisions = useMemo(
    () =>
      divisionOptions.filter(
        (division) => division.provinceKey === activeProvince,
      ),
    [activeProvince],
  );
  return (
    <div className="division-selector">
      <div className="division-selector__provinces" aria-label="Provincie">
        {provinceOptions.map((province) => {
          const selectedCount = divisionOptions.filter(
            (division) =>
              division.provinceKey === province.key &&
              selected.includes(division.key),
          ).length;
          return (
            <button
              type="button"
              className={
                activeProvince === province.key
                  ? "division-selector__province division-selector__province--active"
                  : "division-selector__province"
              }
              aria-pressed={activeProvince === province.key}
              aria-label={`${province.label}${selectedCount ? `, ${selectedCount} geselecteerd` : ""}`}
              onClick={() => setActiveProvince(province.key)}
              key={province.key}
            >
              {province.shortLabel}
              {selectedCount > 0 && (
                <span aria-hidden="true">{selectedCount}</span>
              )}
            </button>
          );
        })}
      </div>

      <div
        className="division-selector__divisions"
        aria-label={`Reeksen in ${
          provinceOptions.find((province) => province.key === activeProvince)
            ?.label ?? ""
        }`}
      >
        {activeDivisions.map((division) => (
          <button
            type="button"
            className={
              selected.includes(division.key)
                ? "division-selector__division division-selector__division--selected"
                : "division-selector__division"
            }
            aria-pressed={selected.includes(division.key)}
            onClick={() => onToggle(division.key)}
            key={division.key}
          >
            {division.shortLabel}
          </button>
        ))}
      </div>

    </div>
  );
}
