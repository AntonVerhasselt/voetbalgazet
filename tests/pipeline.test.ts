import { describe, expect, it } from "vitest";
import { validateIdeaBatch } from "../convex/lib/pipelineIdeaBatch";
import { buildFixtureIdeaBatch } from "../convex/lib/pipelineFixtures";
import { assertPhaseTransition } from "../convex/lib/pipelinePhases";
import { resolvePipelineResearchMode } from "../convex/lib/pipelineMode";
import {
  neonIdToPublicKeyRemaps,
  neonSeriesIdForDivision,
  resolveSeriesRef,
  toPublicDivisionKey,
} from "../convex/lib/neonSeriesMap";
import { buildResearchTaskMessage } from "../convex/lib/pipelineTaskPrompt";
import { divisionOptions, teamOptions } from "../convex/lib/preferenceCatalog";

describe("pipeline IdeaBatch validation", () => {
  it("accepts fixture batch", () => {
    const batch = validateIdeaBatch(buildFixtureIdeaBatch("antwerpen-p1"));
    expect(batch.ideas).toHaveLength(5);
    expect(batch.ideas[0]?.titleProposals).toHaveLength(3);
  });

  it("rejects wrong idea count", () => {
    const bad = buildFixtureIdeaBatch("antwerpen-p1");
    bad.ideas = bad.ideas.slice(0, 4);
    expect(() => validateIdeaBatch(bad)).toThrow(/5 ideeën/);
  });

  it("rejects more than 3 interviewees", () => {
    const bad = buildFixtureIdeaBatch("antwerpen-p1");
    const person = bad.ideas[0]!.interviewees[0]!;
    bad.ideas[0]!.interviewees = [person, person, person, person];
    expect(() => validateIdeaBatch(bad)).toThrow(/max 3/);
  });

  it("rejects duplicate interviewees in one idea", () => {
    const bad = buildFixtureIdeaBatch("antwerpen-p1");
    const person = bad.ideas[0]!.interviewees[0]!;
    bad.ideas[0]!.interviewees = [person, { ...person }];
    expect(() => validateIdeaBatch(bad)).toThrow(/dubbele interviewkandidaat/);
  });

  it("rejects fewer than 3 title proposals", () => {
    const bad = buildFixtureIdeaBatch("antwerpen-p1");
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
  it("maps readable public keys to Neon series ids", () => {
    expect(resolveSeriesRef("antwerpen-p1")?.neonSeriesId).toBe("CHP_130005");
    expect(resolveSeriesRef("CHP_136335")?.publicKey).toBe("antwerpen-p2a");
    expect(neonSeriesIdForDivision("antwerpen-bva-g1")).toBe("CHP_134688");
  });

  it("normalizes Neon ids back to readable public keys", () => {
    expect(toPublicDivisionKey("antwerpen-p1")).toBe("antwerpen-p1");
    expect(toPublicDivisionKey("CHP_130005")).toBe("antwerpen-p1");
    expect(toPublicDivisionKey("limburg-p1")).toBe("limburg-p1");
  });

  it("lists Neon→public remaps for recovery / dual-read", () => {
    expect(neonIdToPublicKeyRemaps()).toEqual([
      {
        from: "CHP_130005",
        to: "antwerpen-p1",
        neonSeriesName: "1 Provinciaal Antw",
      },
      {
        from: "CHP_136335",
        to: "antwerpen-p2a",
        neonSeriesName: "2 Provinciaal Antw A",
      },
      {
        from: "CHP_134688",
        to: "antwerpen-bva-g1",
        neonSeriesName: "BvA Heren Groep 1 P1/P2",
      },
    ]);
  });
});

describe("preference catalog readable keys", () => {
  it("never exposes Neon CHP_ ids as catalog keys", () => {
    for (const division of divisionOptions) {
      expect(division.key).not.toMatch(/^CHP_/);
      expect(division.key).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("includes readable BvA key and Antwerp sample teams", () => {
    expect(divisionOptions.some((d) => d.key === "antwerpen-bva-g1")).toBe(
      true,
    );
    expect(
      teamOptions.find((t) => t.key === "kfc-duffel")?.divisionKeys,
    ).toEqual(["antwerpen-p1"]);
    expect(
      teamOptions.find((t) => t.key === "tor-deurne-pirates")?.divisionKeys,
    ).toEqual(["antwerpen-p2a"]);
  });
});

describe("research task prompt", () => {
  it("includes Neon series id for SQL while keyed by public key", () => {
    const prompt = buildResearchTaskMessage({
      divisionKey: "antwerpen-p1",
      divisionLabel: "1ste provinciale Antwerpen",
    });
    expect(prompt).toContain("antwerpen-p1");
    expect(prompt).toContain("CHP_130005");
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
