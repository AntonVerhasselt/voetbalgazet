import { z } from "zod";

const MAX_SHORT = 200;
const MAX_MEDIUM = 1_200;
const MAX_LONG = 4_000;

const dutchString = (max: number, description: string) =>
  z.string().min(1).max(max).describe(description);

export const supportingFactSchema = z.object({
  claim: dutchString(
    MAX_MEDIUM,
    "De journalistieke claim in het Nederlands (wat je beweert).",
  ),
  evidence: dutchString(
    MAX_LONG,
    "Onderbouwing: concrete cijfers of query-resultaat (geen verzinsel).",
  ),
  source: z
    .enum(["neon", "convex"])
    .describe('Bron van het feit: "neon" (voetbaldata) of "convex" (redactionele context).'),
  sqlFingerprint: z
    .string()
    .max(500)
    .optional()
    .describe("Optionele korte SQL-vingerafdruk of query-label voor audit."),
});

export const intervieweeSchema = z.object({
  neonPersonId: dutchString(
    128,
    "Neon person-id van de kandidaat (nooit verzinnen).",
  ),
  fullName: dutchString(200, "Volledige naam zoals in Neon."),
  contactType: z
    .enum(["player", "staff", "board", "other"])
    .describe('Type contact: "player", "staff", "board" of "other".'),
  contactTypeDetail: z
    .string()
    .max(120)
    .optional()
    .describe('Vrije detailrol in het Nederlands, bv. "aanvaller" of "T1-trainer".'),
  neonClubId: dutchString(128, "Neon club-id van de primaire club."),
  clubName: dutchString(200, "Clubnaam (gedenormaliseerd uit Neon)."),
  neonTeamId: z
    .string()
    .max(128)
    .optional()
    .describe("Optionele Neon team-id binnen club/competitie."),
  teamName: z
    .string()
    .max(200)
    .optional()
    .describe("Optionele teamnaam."),
  whyInterview: dutchString(
    MAX_MEDIUM,
    "Waarom deze persoon interviewen — in het Nederlands.",
  ),
  questions: z
    .array(
      dutchString(
        MAX_MEDIUM,
        "Concrete interviewvraag in het Nederlands voor deze kandidaat.",
      ),
    )
    .min(1)
    .max(8)
    .describe(
      "1–8 interviewvragen die de redactie aan deze persoon zou stellen (Nederlands).",
    ),
});

export const ideaProposalSchema = z.object({
  ideaTitle: dutchString(
    MAX_SHORT,
    "Korte werk-titel van het idee (Nederlands).",
  ),
  titleProposals: z
    .tuple([
      dutchString(MAX_SHORT, "Titelvoorstel 1 (Nederlands)."),
      dutchString(MAX_SHORT, "Titelvoorstel 2 (Nederlands)."),
      dutchString(MAX_SHORT, "Titelvoorstel 3 (Nederlands)."),
    ])
    .describe("Precies drie titelvoorstellen; alle drie blijven bewaard bij goedkeuring."),
  whyInteresting: dutchString(
    MAX_LONG,
    "Waarom dit redactioneel interessant is voor deze reeks (Nederlands).",
  ),
  supportingFacts: z
    .array(supportingFactSchema)
    .min(1)
    .max(8)
    .describe("1–8 onderbouwde feiten; bij voorkeur bron neon."),
  interviewees: z
    .array(intervieweeSchema)
    .max(3)
    .describe("0–3 interviewkandidaten met echte Neon-ids."),
  researchSummary: z
    .string()
    .max(MAX_LONG)
    .optional()
    .describe("Optionele korte researchsamenvatting in het Nederlands."),
});

/** Structured output for a successful research run: exactly five ideas. */
export const ideaBatchSchema = z.object({
  ideas: z
    .tuple([
      ideaProposalSchema,
      ideaProposalSchema,
      ideaProposalSchema,
      ideaProposalSchema,
      ideaProposalSchema,
    ])
    .describe("Precies vijf artikelideeën voor de gevraagde reeks."),
});

export type SupportingFact = z.infer<typeof supportingFactSchema>;
export type Interviewee = z.infer<typeof intervieweeSchema>;
export type IdeaProposal = z.infer<typeof ideaProposalSchema>;
export type IdeaBatch = z.infer<typeof ideaBatchSchema>;

export function parseIdeaBatch(value: unknown): IdeaBatch {
  return ideaBatchSchema.parse(value);
}

export function safeParseIdeaBatch(value: unknown) {
  return ideaBatchSchema.safeParse(value);
}
