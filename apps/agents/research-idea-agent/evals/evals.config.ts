import { defineEvalConfig } from "eve/evals";

/**
 * Shared eval defaults. Deterministic fixture checks do not need a judge model.
 * Grounding evals against Neon land in a later phase.
 */
export default defineEvalConfig({
  timeoutMs: 60_000,
  maxConcurrency: 2,
});
