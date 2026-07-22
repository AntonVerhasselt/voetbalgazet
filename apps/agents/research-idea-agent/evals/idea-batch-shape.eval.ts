import { defineEval } from "eve/evals";
import { equals, satisfies } from "eve/evals/expect";
import { ideaBatchSchema } from "../agent/lib/idea-batch";
import { sampleIdeaBatch } from "./fixtures/sample-idea-batch";

export default defineEval({
  description:
    "IdeaBatch fixture has exactly 5 ideas, 3 titles each, and ≤3 interviewees.",
  tags: ["shape", "fixture", "fast"],
  async test(t) {
    const health = await t.target.fetch("/eve/v1/health");
    t.check(health.ok, equals(true));

    const parsed = ideaBatchSchema.parse(sampleIdeaBatch);

    t.check(parsed.ideas.length, equals(5));

    for (const [index, idea] of parsed.ideas.entries()) {
      t.check(
        idea.titleProposals.length,
        equals(3),
      );
      t.check(
        idea.interviewees.length,
        satisfies(
          (count) => typeof count === "number" && count <= 3,
          `ideas[${index}] interviewees ≤ 3`,
        ),
      );
      t.check(
        idea.supportingFacts.length >= 1,
        equals(true),
      );
    }
  },
});
