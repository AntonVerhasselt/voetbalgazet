import { describe, expect, it } from "vitest";
import { validateIdeaBatch } from "../convex/lib/pipelineIdeaBatch";
import { buildFixtureIdeaBatch } from "../convex/lib/pipelineFixtures";
import { assertPhaseTransition } from "../convex/lib/pipelinePhases";
import { resolvePipelineResearchMode } from "../convex/lib/pipelineMode";
import {
  canonicalizeDivisionKey,
  legacyPlaceholderRemaps,
  resolveSeriesRef,
} from "../convex/lib/neonSeriesMap";
import { buildResearchTaskMessage } from "../convex/lib/pipelineTaskPrompt";
import { divisionOptions, teamOptions } from "../convex/lib/preferenceCatalog";

describe("pipeline IdeaBatch validation", () => {
  it("accepts fixture batch", () => {
    const batch = validateIdeaBatch(buildFixtureIdeaBatch("CHP_130005"));
    expect(batch.ideas).toHaveLength(5);
    expect(batch.ideas[0]?.titleProposals).toHaveLength(3);
  });

  it("rejects wrong idea count", () => {
    const bad = buildFixtureIdeaBatch("CHP_130005");
    bad.ideas = bad.ideas.slice(0, 4);
    expect(() => validateIdeaBatch(bad)).toThrow(/5 ideeën/);
  });

  it("rejects more than 3 interviewees", () => {
    const bad = buildFixtureIdeaBatch("CHP_130005");
    const person = bad.ideas[0]!.interviewees[0]!;
    bad.ideas[0]!.interviewees = [person, person, person, person];
    expect(() => validateIdeaBatch(bad)).toThrow(/max 3/);
  });

  it("rejects duplicate interviewees in one idea", () => {
    const bad = buildFixtureIdeaBatch("CHP_130005");
    const person = bad.ideas[0]!.interviewees[0]!;
    bad.ideas[0]!.interviewees = [person, { ...person }];
    expect(() => validateIdeaBatch(bad)).toThrow(/dubbele interviewkandidaat/);
  });

  it("rejects fewer than 3 title proposals", () => {
    const bad = buildFixtureIdeaBatch("CHP_130005");
    bad.ideas[0]!.titleProposals = ["Alleen één titel"];
    expect(() => validateIdeaBatch(bad)).toThrow();
  });
});

describe("pipeline phase transitions", () => {
  it("allows approve and reject from idea_review", () => {
    expect(() =>
      assertPhaseTransition("idea_review", "awaiting_contacts"),
    ).not.toThrow();
    expect(() => assertPhaseTransition("idea_review", "rejected")).not.toThrow();
  });

  it("blocks invalid transitions", () => {
    expect(() => assertPhaseTransition("idea_review", "published")).toThrow(
      /Ongeldige fase-overgang/,
    );
  });
});

describe("neon series map", () => {
  it("maps placeholder to Neon series", () => {
    expect(resolveSeriesRef("antwerpen-p1")?.neonSeriesId).toBe("CHP_130005");
    expect(resolveSeriesRef("CHP_136335")?.placeholderKey).toBe("antwerpen-p2a");
  });

  it("canonicalizes placeholders and leaves unknown keys", () => {
    expect(canonicalizeDivisionKey("antwerpen-p1")).toBe("CHP_130005");
    expect(canonicalizeDivisionKey("CHP_130005")).toBe("CHP_130005");
    expect(canonicalizeDivisionKey("limburg-p1")).toBe("limburg-p1");
  });

  it("lists legacy remaps for migration", () => {
    expect(legacyPlaceholderRemaps()).toEqual([
      {
        from: "antwerpen-p1",
        to: "CHP_130005",
        neonSeriesName: "1 Provinciaal Antw",
      },
      {
        from: "antwerpen-p2a",
        to: "CHP_136335",
        neonSeriesName: "2 Provinciaal Antw A",
      },
    ]);
  });
});

describe("preference catalog neon keys", () => {
  it("exposes Neon ids for mapped Antwerp series and BvA", () => {
    const keys = new Set(divisionOptions.map((d) => d.key));
    expect(keys.has("CHP_130005")).toBe(true);
    expect(keys.has("CHP_136335")).toBe(true);
    expect(keys.has("CHP_134688")).toBe(true);
    expect(keys.has("antwerpen-p1")).toBe(false);
  });

  it("points Antwerp sample teams at Neon division ids", () => {
    expect(
      teamOptions.find((t) => t.key === "kfc-duffel")?.divisionKeys,
    ).toEqual(["CHP_130005"]);
    expect(
      teamOptions.find((t) => t.key === "tor-deurne-pirates")?.divisionKeys,
    ).toEqual(["CHP_136335"]);
  });
});

describe("research task prompt", () => {
  it("includes Neon series id for SQL filters", () => {
    const prompt = buildResearchTaskMessage({
      divisionKey: "CHP_130005",
      divisionLabel: "1ste provinciale Antwerpen",
    });
    expect(prompt).toContain("CHP_130005");
    expect(prompt).toContain("5");
    expect(prompt).toMatch(/Nederlands/);
  });
});

describe("pipeline research mode", () => {
  function withEnv(
    env: Record<string, string | undefined>,
    fn: () => void,
  ): void {
    const keys = [
      "PIPELINE_RESEARCH_MODE",
      "PIPELINE_ENV",
      "EVE_AGENT_URL",
      "EVE_INVOKE_TOKEN",
      "VERCEL_ENV",
      "NODE_ENV",
    ] as const;
    const prev: Record<string, string | undefined> = {};
    for (const key of keys) {
      prev[key] = process.env[key];
      const next = env[key];
      if (next === undefined) delete process.env[key];
      else process.env[key] = next;
    }
    try {
      fn();
    } finally {
      for (const key of keys) {
        if (prev[key] === undefined) delete process.env[key];
        else process.env[key] = prev[key];
      }
    }
  }

  it("defaults to fixture outside production when Eve unset", () => {
    withEnv(
      {
        PIPELINE_RESEARCH_MODE: undefined,
        EVE_AGENT_URL: undefined,
        EVE_INVOKE_TOKEN: undefined,
        VERCEL_ENV: undefined,
        NODE_ENV: "development",
      },
      () => {
        const resolved = resolvePipelineResearchMode();
        expect(resolved.mode).toBe("fixture");
        expect(resolved.error).toBeUndefined();
      },
    );
  });

  it("fail-closed in production without Eve", () => {
    withEnv(
      {
        PIPELINE_RESEARCH_MODE: undefined,
        EVE_AGENT_URL: undefined,
        EVE_INVOKE_TOKEN: undefined,
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      },
      () => {
        const resolved = resolvePipelineResearchMode();
        expect(resolved.error).toMatch(/niet geconfigureerd/);
      },
    );
  });

  it("does not treat NODE_ENV=production alone as production", () => {
    withEnv(
      {
        PIPELINE_RESEARCH_MODE: "fixture",
        EVE_AGENT_URL: undefined,
        EVE_INVOKE_TOKEN: undefined,
        VERCEL_ENV: undefined,
        NODE_ENV: "production",
      },
      () => {
        const resolved = resolvePipelineResearchMode();
        expect(resolved.mode).toBe("fixture");
        expect(resolved.error).toBeUndefined();
      },
    );
  });

  it("rejects fixture mode when PIPELINE_ENV=production", () => {
    withEnv(
      {
        PIPELINE_RESEARCH_MODE: "fixture",
        PIPELINE_ENV: "production",
        VERCEL_ENV: undefined,
        NODE_ENV: "development",
      },
      () => {
        const resolved = resolvePipelineResearchMode();
        expect(resolved.error).toMatch(/niet toegestaan in productie/);
      },
    );
  });

  it("rejects fixture mode in production", () => {
    withEnv(
      {
        PIPELINE_RESEARCH_MODE: "fixture",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      },
      () => {
        const resolved = resolvePipelineResearchMode();
        expect(resolved.error).toMatch(/niet toegestaan in productie/);
      },
    );
  });

  it("uses eve when URL and token are set", () => {
    withEnv(
      {
        PIPELINE_RESEARCH_MODE: undefined,
        EVE_AGENT_URL: "https://agent.example",
        EVE_INVOKE_TOKEN: "token-value",
        VERCEL_ENV: undefined,
        NODE_ENV: "development",
      },
      () => {
        const resolved = resolvePipelineResearchMode();
        expect(resolved.mode).toBe("eve");
        expect(resolved.eveConfigured).toBe(true);
        expect(resolved.error).toBeUndefined();
      },
    );
  });
});
