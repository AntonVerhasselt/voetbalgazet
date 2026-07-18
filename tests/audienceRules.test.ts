import { describe, expect, it } from "vitest";
import {
  describeAudienceRules,
  deriveLegacyFilters,
  durationMs,
  evaluateCondition,
  legacyToRuleGroups,
  resolveRuleGroups,
  subscriberMatchesRuleGroups,
  validateRuleGroups,
  type AudienceRuleGroup,
  type DivisionMeta,
} from "../convex/lib/audienceRules";

const divisionAntwerpP1 = {
  _id: "div_ant_p1" as DivisionMeta["_id"],
  label: "1ste provinciale Antwerpen",
  provinceKey: "antwerpen",
  level: 1,
};
const divisionLimburgP2 = {
  _id: "div_lim_p2" as DivisionMeta["_id"],
  label: "2de provinciale A Limburg",
  provinceKey: "limburg",
  level: 2,
};

const divisionMeta = new Map<string, DivisionMeta>([
  [divisionAntwerpP1._id, divisionAntwerpP1],
  [divisionLimburgP2._id, divisionLimburgP2],
]);

const now = Date.UTC(2026, 6, 18);

describe("audienceRules", () => {
  it("converts legacy filters into one AND group", () => {
    const groups = legacyToRuleGroups({
      divisionIds: [divisionAntwerpP1._id],
      favoriteTeamIds: ["team_duffel" as never],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.conditions.map((c) => c.field)).toEqual([
      "division",
      "favorite_team",
    ]);
  });

  it("resolves undefined ruleGroups from legacy fields", () => {
    const groups = resolveRuleGroups({
      divisionIds: [divisionAntwerpP1._id],
      favoriteTeamIds: [],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.conditions[0]?.field).toBe("division");
  });

  it("treats empty ruleGroups as all subscribers", () => {
    expect(
      subscriberMatchesRuleGroups(
        { divisionIds: [] },
        [],
        divisionMeta,
        now,
      ),
    ).toBe(true);
  });

  it("matches province when subscriber follows a division in that province", () => {
    const groups: AudienceRuleGroup[] = [
      {
        id: "g1",
        conditions: [
          {
            id: "c1",
            field: "province",
            operator: "any_of",
            provinceKeys: ["antwerpen"],
          },
        ],
      },
    ];
    expect(
      subscriberMatchesRuleGroups(
        { divisionIds: [divisionAntwerpP1._id] },
        groups,
        divisionMeta,
        now,
      ),
    ).toBe(true);
    expect(
      subscriberMatchesRuleGroups(
        { divisionIds: [divisionLimburgP2._id] },
        groups,
        divisionMeta,
        now,
      ),
    ).toBe(false);
  });

  it("ORs groups and ANDs conditions within a group", () => {
    const groups: AudienceRuleGroup[] = [
      {
        id: "g1",
        conditions: [
          {
            id: "c1",
            field: "province",
            operator: "any_of",
            provinceKeys: ["antwerpen"],
          },
          {
            id: "c2",
            field: "division_level",
            operator: "any_of",
            levels: [1],
          },
        ],
      },
      {
        id: "g2",
        conditions: [
          {
            id: "c3",
            field: "favorite_team",
            operator: "any_of",
            teamIds: ["team_x" as never],
          },
        ],
      },
    ];

    // Antwerp P1 satisfies group 1
    expect(
      subscriberMatchesRuleGroups(
        { divisionIds: [divisionAntwerpP1._id] },
        groups,
        divisionMeta,
        now,
      ),
    ).toBe(true);

    // Limburg P2 fails group 1 (wrong province/level combo) and group 2 (no team)
    expect(
      subscriberMatchesRuleGroups(
        { divisionIds: [divisionLimburgP2._id] },
        groups,
        divisionMeta,
        now,
      ),
    ).toBe(false);

    // Favorite team alone satisfies group 2
    expect(
      subscriberMatchesRuleGroups(
        {
          divisionIds: [divisionLimburgP2._id],
          favoriteTeamId: "team_x" as never,
        },
        groups,
        divisionMeta,
        now,
      ),
    ).toBe(true);
  });

  it("matches subscribed_within using relative window", () => {
    const condition = {
      id: "c1",
      field: "subscribed_within" as const,
      operator: "in_the_last" as const,
      amount: 30,
      unit: "days" as const,
    };
    expect(
      evaluateCondition(
        condition,
        { divisionIds: [], newsletterSubscribedAt: now - durationMs(10, "days") },
        divisionMeta,
        now,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        condition,
        { divisionIds: [], newsletterSubscribedAt: now - durationMs(40, "days") },
        divisionMeta,
        now,
      ),
    ).toBe(false);
  });

  it("derives legacy filters only for simple single-group rules", () => {
    expect(
      deriveLegacyFilters([
        {
          id: "g1",
          conditions: [
            {
              id: "c1",
              field: "division",
              operator: "any_of",
              divisionIds: [divisionAntwerpP1._id],
            },
          ],
        },
      ]),
    ).toEqual({
      divisionIds: [divisionAntwerpP1._id],
      favoriteTeamIds: [],
    });

    expect(
      deriveLegacyFilters([
        {
          id: "g1",
          conditions: [
            {
              id: "c1",
              field: "province",
              operator: "any_of",
              provinceKeys: ["antwerpen"],
            },
          ],
        },
      ]),
    ).toEqual({ divisionIds: [], favoriteTeamIds: [] });
  });

  it("describes province and OR groups in Dutch", () => {
    const text = describeAudienceRules({
      ruleGroups: [
        {
          id: "g1",
          conditions: [
            {
              id: "c1",
              field: "province",
              operator: "any_of",
              provinceKeys: ["antwerpen", "limburg"],
            },
          ],
        },
        {
          id: "g2",
          conditions: [
            {
              id: "c2",
              field: "has_favorite_team",
              operator: "eq",
              value: true,
            },
          ],
        },
      ],
      divisions: [divisionAntwerpP1, divisionLimburgP2],
      teams: [],
    });
    expect(text).toContain("provincie Antwerpen of Limburg");
    expect(text).toContain("heeft een favoriete club");
    expect(text).toContain(") of (");
  });

  it("matches email_activity after/before using denormalized timestamps", () => {
    const afterCondition = {
      id: "c1",
      field: "email_activity" as const,
      operator: "opened" as const,
      relative: "after" as const,
      at: now - durationMs(7, "days"),
    };
    expect(
      evaluateCondition(
        afterCondition,
        {
          divisionIds: [],
          lastEmailOpenedAt: now - durationMs(2, "days"),
        },
        divisionMeta,
        now,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        afterCondition,
        {
          divisionIds: [],
          lastEmailOpenedAt: now - durationMs(20, "days"),
        },
        divisionMeta,
        now,
      ),
    ).toBe(false);
  });

  it("rejects empty condition values on validate", () => {
    expect(() =>
      validateRuleGroups([
        {
          id: "g1",
          conditions: [
            {
              id: "c1",
              field: "province",
              operator: "any_of",
              provinceKeys: [],
            },
          ],
        },
      ]),
    ).toThrow(/provincie/i);
  });
});
