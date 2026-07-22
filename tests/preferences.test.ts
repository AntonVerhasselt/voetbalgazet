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
        ["antwerpen-p1", "antwerpen-p1"],
        "kfc-duffel",
      ),
    ).toEqual({
      divisionKeys: ["antwerpen-p1"],
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

  it("keeps user-facing division keys readable (never Neon CHP_ ids)", () => {
    expect(divisionOptions.some((d) => d.key === "antwerpen-p1")).toBe(true);
    expect(divisionOptions.some((d) => d.key === "antwerpen-bva-g1")).toBe(
      true,
    );
    expect(divisionOptions.some((d) => d.key.startsWith("CHP_"))).toBe(false);
  });
});
