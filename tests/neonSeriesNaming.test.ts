import { describe, expect, it } from "vitest";
import {
  buildSignupTeams,
  isCupSeries,
  parseAllNeonSeries,
  parseNeonSeries,
  provincialSignupDivisions,
  slugifyKey,
} from "../convex/lib/neonSeriesNaming";

describe("neonSeriesNaming", () => {
  it("parses undivided and grouped provincial series", () => {
    expect(parseNeonSeries({ id: "CHP_130005", name: "1 Provinciaal Antw" })).toMatchObject({
      kind: "provincial",
      publicKey: "antwerpen-p1",
      shortLabel: "1",
      catalogLabel: "1ste provinciale Antwerpen",
      provinceKey: "antwerpen",
      level: 1,
      group: null,
    });
    expect(
      parseNeonSeries({ id: "CHP_136335", name: "2 Provinciaal Antw A" }),
    ).toMatchObject({
      kind: "provincial",
      publicKey: "antwerpen-p2a",
      shortLabel: "2A",
      level: 2,
      group: "A",
    });
    expect(
      parseNeonSeries({ id: "CHP_130513", name: "4 Provinciaal Antw G" }),
    ).toMatchObject({
      publicKey: "antwerpen-p4g",
      shortLabel: "4G",
      level: 4,
    });
    expect(
      parseNeonSeries({ id: "CHP_136333", name: "1 Provinciaal Ovl" }),
    ).toMatchObject({
      publicKey: "oost-vlaanderen-p1",
      provinceKey: "oost-vlaanderen",
    });
  });

  it("classifies beker / Bv* series as cups", () => {
    expect(isCupSeries({ id: "CUP_3742", name: "Beker RVRW ANT" })).toBe(true);
    expect(
      isCupSeries({ id: "CHP_134688", name: "BvA Heren Groep 1 P1/P2" }),
    ).toBe(true);
    expect(
      isCupSeries({ id: "CHP_136560", name: "Beker van Vlaanderen A" }),
    ).toBe(true);
    expect(
      isCupSeries({ id: "CHP_130005", name: "1 Provinciaal Antw" }),
    ).toBe(false);
  });

  it("keeps cups out of signup divisions while mapping them", () => {
    const parsed = parseAllNeonSeries([
      { id: "CHP_130005", name: "1 Provinciaal Antw" },
      { id: "CHP_134688", name: "BvA Heren Groep 1 P1/P2" },
      { id: "CUP_3742", name: "Beker RVRW ANT" },
    ]);
    const signup = provincialSignupDivisions(parsed);
    expect(signup.map((d) => d.publicKey)).toEqual(["antwerpen-p1"]);
    expect(parsed.find((s) => s.neonSeriesId === "CHP_134688")).toMatchObject({
      kind: "cup",
      publicKey: "bva-heren-groep-1-p1-p2",
    });
  });

  it("builds unique team keys scoped to provincial series", () => {
    const parsed = parseAllNeonSeries([
      { id: "CHP_130005", name: "1 Provinciaal Antw" },
      { id: "CHP_136335", name: "2 Provinciaal Antw A" },
    ]);
    const provincial = new Map(
      provincialSignupDivisions(parsed).map((d) => [d.neonSeriesId, d] as const),
    );
    const teams = buildSignupTeams(
      [
        {
          team_id: "1",
          club_id: "c1",
          club_name: "KFC Duffel",
          complement: "A",
          display_name: "Football Club Duffel A",
          series_id: "CHP_130005",
        },
        {
          team_id: "2",
          club_id: "c2",
          club_name: "Other",
          complement: null,
          display_name: "Football Club Duffel A",
          series_id: "CHP_136335",
        },
      ],
      provincial,
    );
    expect(teams).toHaveLength(2);
    expect(teams[0]?.key).toBe("football-club-duffel-a");
    expect(teams[1]?.key).toBe("football-club-duffel-a-2");
    expect(slugifyKey("K.F.C. Zwarte Leeuw")).toBe("k-f-c-zwarte-leeuw");
  });
});
