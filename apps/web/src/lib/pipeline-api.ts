import { api } from "@convex/_generated/api";

/** Convenience alias — prefer `api.pipeline` at call sites when convenient. */
export const pipelineApi = api.pipeline;

export type PipelineDivisionRow = {
  key: string;
  label: string;
  ideaReviewCount: number;
  researchBusy: boolean;
  neonSeriesId: string | null;
};
