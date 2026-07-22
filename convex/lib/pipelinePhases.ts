import type { PipelinePhase } from "./pipelineValidators";

const ALLOWED: Partial<Record<PipelinePhase, readonly PipelinePhase[]>> = {
  idea_review: ["awaiting_contacts", "rejected", "failed"],
  awaiting_contacts: [
    "interview_scheduling",
    "interview_ready",
    "rejected",
    "failed",
  ],
  interview_scheduling: ["interview_ready", "interviewing", "rejected", "failed"],
  interview_ready: ["interviewing", "rejected", "failed"],
  interviewing: ["interview_complete", "failed", "rejected"],
  interview_complete: ["drafting", "failed"],
  drafting: ["draft_review", "failed"],
  draft_review: ["ready_to_publish", "drafting", "rejected", "failed"],
  ready_to_publish: ["published", "draft_review", "failed"],
  published: [],
  rejected: [],
  failed: ["idea_review"],
};

export function assertPhaseTransition(
  from: PipelinePhase,
  to: PipelinePhase,
): void {
  const allowed = ALLOWED[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Ongeldige fase-overgang: ${from} → ${to}`);
  }
}

export function phaseStripBucket(
  phase: PipelinePhase,
): "ideeen" | "contacten" | "interviews" | "drafts" | "publicatie" | null {
  switch (phase) {
    case "idea_review":
      return "ideeen";
    case "awaiting_contacts":
      return "contacten";
    case "interview_scheduling":
    case "interview_ready":
    case "interviewing":
    case "interview_complete":
      return "interviews";
    case "drafting":
    case "draft_review":
      return "drafts";
    case "ready_to_publish":
    case "published":
      return "publicatie";
    default:
      return null;
  }
}
