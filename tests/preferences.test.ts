import { describe, expect, it } from "vitest";
import {
  divisionOptions,
  provinceOptions,
  teamOptions,
} from "../convex/lib/preferenceCatalog";
import { validatePreferenceKeys } from "../convex/lib/subscriberPreferences";
import { generatedNeonSeries } from "../convex/lib/generated/neonTaxonomyData";

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

  it("offers Neon provincial short labels per province (no cups)", () => {
    for (const province of provinceOptions) {
      const labels = divisionOptions
        .filter((division) => division.provinceKey === province.key)
        .map((division) => division.shortLabel);
      expect(labels.length).toBeGreaterThanOrEqual(6);
      expect(labels).toContain("1");
      expect(labels.every((label) => /^\d[A-Z]?$/.test(label))).toBe(true);
    }
    expect(
      divisionOptions.some(
        (d) => /beker|cup|bva|bvl|bvw|bvoh|bvof/i.test(d.key) || /Beker|Cup|BvA/.test(d.label),
      ),
    ).toBe(false);
  });

  it("keeps user-facing division keys readable (never Neon CHP_/CUP_ ids)", () => {
    expect(divisionOptions.some((d) => d.key === "antwerpen-p1")).toBe(true);
    expect(divisionOptions.some((d) => d.key === "antwerpen-p4g")).toBe(true);
    expect(divisionOptions.some((d) => d.key.startsWith("CHP_"))).toBe(false);
    expect(divisionOptions.some((d) => d.key.startsWith("CUP_"))).toBe(false);
    expect(teamOptions.some((t) => t.key === "kfc-duffel")).toBe(true);
    expect(teamOptions.length).toBeGreaterThan(100);
  });

  it("maps cup series for research without exposing them in signup catalog", () => {
    expect(
      generatedNeonSeries.some((s) => s.neonSeriesId === "CHP_134688"),
    ).toBe(true);
    expect(divisionOptions.some((d) => d.key === "antwerpen-bva-g1")).toBe(
      false,
    );
  });
});
