import { describe, expect, it } from "vitest";
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
});
