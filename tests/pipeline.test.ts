import { describe, expect, it } from "vitest";
import { validateIdeaBatch } from "../convex/lib/pipelineIdeaBatch";
import { buildFixtureIdeaBatch } from "../convex/lib/pipelineFixtures";
import { assertPhaseTransition } from "../convex/lib/pipelinePhases";
import { resolvePipelineResearchMode } from "../convex/lib/pipelineMode";
import { resolveSeriesRef } from "../convex/lib/neonSeriesMap";

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
});

describe("pipeline research mode", () => {
  it("defaults to fixture outside production when Eve unset", () => {
    const prevMode = process.env.PIPELINE_RESEARCH_MODE;
    const prevUrl = process.env.EVE_AGENT_URL;
    const prevToken = process.env.EVE_INVOKE_TOKEN;
    const prevVercel = process.env.VERCEL_ENV;
    const prevNode = process.env.NODE_ENV;
    delete process.env.PIPELINE_RESEARCH_MODE;
    delete process.env.EVE_AGENT_URL;
    delete process.env.EVE_INVOKE_TOKEN;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = "development";
    try {
      const resolved = resolvePipelineResearchMode();
      expect(resolved.mode).toBe("fixture");
      expect(resolved.error).toBeUndefined();
    } finally {
      if (prevMode === undefined) delete process.env.PIPELINE_RESEARCH_MODE;
      else process.env.PIPELINE_RESEARCH_MODE = prevMode;
      if (prevUrl === undefined) delete process.env.EVE_AGENT_URL;
      else process.env.EVE_AGENT_URL = prevUrl;
      if (prevToken === undefined) delete process.env.EVE_INVOKE_TOKEN;
      else process.env.EVE_INVOKE_TOKEN = prevToken;
      if (prevVercel === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
      if (prevNode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNode;
    }
  });
});
