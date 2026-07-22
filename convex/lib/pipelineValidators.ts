import { v } from "convex/values";

export const MAX_SHORT = 200;
export const MAX_MEDIUM = 1_200;
export const MAX_LONG = 4_000;
/** Max interview questions per suggested interviewee. */
export const MAX_INTERVIEW_QUESTIONS = 8;

export const pipelinePhaseValidator = v.union(
  v.literal("idea_review"),
  v.literal("awaiting_contacts"),
  v.literal("interview_scheduling"),
  v.literal("interview_ready"),
  v.literal("interviewing"),
  v.literal("interview_complete"),
  v.literal("drafting"),
  v.literal("draft_review"),
  v.literal("ready_to_publish"),
  v.literal("published"),
  v.literal("rejected"),
  v.literal("failed"),
);

export const researchRunStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("cancelled"),
);

export const researchRunSourceValidator = v.union(
  v.literal("fixture"),
  v.literal("eve"),
);

export const factSourceValidator = v.union(
  v.literal("neon"),
  v.literal("convex"),
);

export const contactTypeValidator = v.union(
  v.literal("player"),
  v.literal("staff"),
  v.literal("board"),
  v.literal("other"),
);

export const contactSourceValidator = v.union(
  v.literal("research_agent"),
  v.literal("whatsapp_agent"),
  v.literal("manual"),
  v.literal("import"),
);

export const supportingFactValidator = v.object({
  claim: v.string(),
  evidence: v.string(),
  source: factSourceValidator,
  sqlFingerprint: v.optional(v.string()),
});

export const ideaIntervieweeValidator = v.object({
  neonPersonId: v.string(),
  fullName: v.string(),
  contactType: contactTypeValidator,
  contactTypeDetail: v.optional(v.string()),
  neonClubId: v.string(),
  clubName: v.string(),
  neonTeamId: v.optional(v.string()),
  teamName: v.optional(v.string()),
  whyInterview: v.string(),
  interviewerNotes: v.string(),
  questions: v.array(v.string()),
});

export const ideaProposalValidator = v.object({
  ideaTitle: v.string(),
  titleProposals: v.array(v.string()),
  whyInteresting: v.string(),
  supportingFacts: v.array(supportingFactValidator),
  interviewees: v.array(ideaIntervieweeValidator),
  researchSummary: v.optional(v.string()),
});

export const ideaBatchValidator = v.object({
  ideas: v.array(ideaProposalValidator),
});

export const pipelineEventTypeValidator = v.union(
  v.literal("created"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("interviewees_updated"),
  v.literal("questions_updated"),
  v.literal("notes_updated"),
  v.literal("phase_changed"),
  v.literal("research_started"),
  v.literal("research_succeeded"),
  v.literal("research_failed"),
);

export type PipelinePhase =
  | "idea_review"
  | "awaiting_contacts"
  | "interview_scheduling"
  | "interview_ready"
  | "interviewing"
  | "interview_complete"
  | "drafting"
  | "draft_review"
  | "ready_to_publish"
  | "published"
  | "rejected"
  | "failed";

export type IdeaProposalInput = {
  ideaTitle: string;
  titleProposals: string[];
  whyInteresting: string;
  supportingFacts: Array<{
    claim: string;
    evidence: string;
    source: "neon" | "convex";
    sqlFingerprint?: string;
  }>;
  interviewees: Array<{
    neonPersonId: string;
    fullName: string;
    contactType: "player" | "staff" | "board" | "other";
    contactTypeDetail?: string;
    neonClubId: string;
    clubName: string;
    neonTeamId?: string;
    teamName?: string;
    whyInterview: string;
    interviewerNotes: string;
    questions: string[];
  }>;
  researchSummary?: string;
};

export type IdeaBatchInput = {
  ideas: IdeaProposalInput[];
};
