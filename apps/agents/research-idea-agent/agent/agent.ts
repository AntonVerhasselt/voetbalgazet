import { defineAgent } from "eve";
import { ideaBatchSchema } from "./lib/idea-batch";

/**
 * Research Idea Agent (Eve) — De Voetbalgazet.
 *
 * Identity comes from package.json `name` (`voetbalgazet-research-idea`).
 * Task-mode runs (orchestrator / schedules) use `outputSchema` so the turn
 * settles with a validated IdeaBatch. Interactive clients may still pass
 * a per-message schema; prefer the agent-level schema for waiter invokes.
 */
export default defineAgent({
  model: "zai/glm-5.2",
  outputSchema: ideaBatchSchema,
  limits: {
    // Research runs explore Neon with several tool/sandbox steps.
    maxOutputTokensPerSession: 80_000,
  },
});
