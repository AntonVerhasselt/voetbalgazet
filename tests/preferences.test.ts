import { describe, expect, it } from "vitest";
import {
  divisionOptions,
  provinceOptions,
} from "../convex/lib/preferenceCatalog";
import { validatePreferenceKeys } from "../convex/lib/subscriberPreferences";

describe("subscriber preference validation", () => {
  it("requires at least one division", () => {
    expect(() => validatePreferenceKeys([], undefined)).toThrow(
      "Kies minstens één reeks.",
    );
  });

  it("deduplicates valid division keys", () => {
    expect(
      validatePreferenceKeys(
        ["CHP_130005", "CHP_130005"],
        "kfc-duffel",
      ),
    ).toEqual({
      divisionKeys: ["CHP_130005"],
      teamKey: "kfc-duffel",
    });
  });

  it("rejects a team outside the selected divisions", () => {
    expect(() =>
      validatePreferenceKeys(["limburg-p1"], "kfc-duffel"),
    ).toThrow("Kies een reeks waarin je favoriete club actief is.");
  });

  it("offers the six compact divisions in every province", () => {
    const expectedLabels = ["1", "2A", "2B", "3A", "3B", "3C"];
    for (const province of provinceOptions) {
      const labels = divisionOptions
        .filter((division) => division.provinceKey === province.key)
        .map((division) => division.shortLabel);
      expect(labels.slice(0, 6)).toEqual(expectedLabels);
      for (const expected of expectedLabels) {
        expect(labels).toContain(expected);
      }
    }
  });

  it("uses Neon series ids for Antwerp series that exist in Neon", () => {
    expect(divisionOptions.some((d) => d.key === "CHP_130005")).toBe(true);
    expect(divisionOptions.some((d) => d.key === "CHP_136335")).toBe(true);
    expect(divisionOptions.some((d) => d.key === "CHP_134688")).toBe(true);
    expect(divisionOptions.some((d) => d.key === "antwerpen-p1")).toBe(false);
    expect(divisionOptions.some((d) => d.key === "antwerpen-p2a")).toBe(false);
  });
});
