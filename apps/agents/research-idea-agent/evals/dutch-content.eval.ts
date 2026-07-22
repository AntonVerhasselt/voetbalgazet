import { defineEval } from "eve/evals";
import { equals } from "eve/evals/expect";
import { ideaBatchLooksDutch } from "../agent/lib/dutch-heuristic";
import { sampleIdeaBatch } from "./fixtures/sample-idea-batch";

export default defineEval({
  description:
    "IdeaBatch string fields look Dutch (heuristic on fixture content).",
  tags: ["dutch", "fixture", "fast"],
  async test(t) {
    const health = await t.target.fetch("/eve/v1/health");
    t.check(health.ok, equals(true));

    const result = ideaBatchLooksDutch(sampleIdeaBatch);
    t.check(result.ok, equals(true));
    t.check(result.failures, equals([]));
  },
});
