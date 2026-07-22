import { describe, expect, it } from "vitest";
import {
  ideaBatchSchema,
  safeParseIdeaBatch,
} from "../agent/lib/idea-batch";
import { ideaBatchLooksDutch, looksDutch } from "../agent/lib/dutch-heuristic";
import { buildResearchTaskMessage } from "../agent/lib/task-prompt";
import { getDivisionContext } from "../agent/lib/division-context";
import { sampleIdeaBatch } from "./fixtures/sample-idea-batch";

describe("ideaBatchSchema", () => {
  it("accepts the sample fixture", () => {
    const parsed = ideaBatchSchema.parse(sampleIdeaBatch);
    expect(parsed.ideas).toHaveLength(5);
    expect(parsed.ideas[0]?.titleProposals).toHaveLength(3);
  });

  it("rejects fewer than 5 ideas", () => {
    const bad = {
      ideas: sampleIdeaBatch.ideas.slice(0, 4),
    };
    const result = safeParseIdeaBatch(bad);
    expect(result.success).toBe(false);
  });

  it("rejects more than 3 interviewees", () => {
    const idea = sampleIdeaBatch.ideas[0]!;
    const person = idea.interviewees[0]!;
    const bad = {
      ideas: [
        {
          ...idea,
          interviewees: [person, person, person, person],
        },
        ...sampleIdeaBatch.ideas.slice(1),
      ],
    };
    const result = safeParseIdeaBatch(bad);
    expect(result.success).toBe(false);
  });
});

describe("dutch heuristic", () => {
  it("accepts Dutch prose", () => {
    expect(looksDutch("De ploeg won met twee doelpunten verschil")).toBe(true);
  });

  it("rejects obvious English-only copy", () => {
    expect(
      looksDutch(
        "The player scored many goals without the coach and the club although their season",
      ),
    ).toBe(false);
  });

  it("marks the fixture batch as Dutch", () => {
    expect(ideaBatchLooksDutch(sampleIdeaBatch).ok).toBe(true);
  });
});

describe("task prompt", () => {
  it("builds a Dutch research brief", () => {
    const message = buildResearchTaskMessage({
      divisionKey: "antwerpen-p1",
      divisionLabel: "1ste provinciale Antwerpen",
      editorialPrefs: ["Lokale clubs eerst"],
    });
    expect(message).toContain("Genereer precies **5** artikelideeën");
    expect(message).toContain("antwerpen-p1");
    expect(message).toContain("Lokale clubs eerst");
  });
});

describe("division context", () => {
  it("returns known Antwerp first provincial prefs", () => {
    const ctx = getDivisionContext("antwerpen-p1");
    expect(ctx.label).toContain("Antwerpen");
    expect(ctx.editorialPrefs.length).toBeGreaterThan(0);
  });
});
