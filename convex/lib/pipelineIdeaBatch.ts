import {
  MAX_INTERVIEW_QUESTIONS,
  MAX_LONG,
  MAX_MEDIUM,
  MAX_SHORT,
  type IdeaBatchInput,
  type IdeaProposalInput,
} from "./pipelineValidators";

function assertLen(label: string, value: string, max: number): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} mag niet leeg zijn`);
  }
  if (value.length > max) {
    throw new Error(`${label} is te lang (max ${max} tekens)`);
  }
}

/**
 * Normalize interview questions for storage / IdeaBatch validation.
 * Trims, drops empties, enforces max count and length.
 */
export function normalizeInterviewQuestions(
  raw: unknown,
  options: {
    label: string;
    /** Agent IdeaBatch requires ≥1; admin edits allow 0. */
    minCount: number;
    maxCount?: number;
  },
): string[] {
  if (!Array.isArray(raw)) {
    throw new Error(`${options.label}: questions moet een array zijn`);
  }
  const maxCount = options.maxCount ?? MAX_INTERVIEW_QUESTIONS;
  if (raw.length > maxCount) {
    throw new Error(
      `${options.label}: max ${maxCount} interviewvragen`,
    );
  }
  const questions: string[] = [];
  for (const [index, value] of raw.entries()) {
    if (typeof value !== "string") {
      throw new Error(
        `${options.label}: vraag ${index + 1} is ongeldig`,
      );
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    assertLen(
      `${options.label}: vraag ${index + 1}`,
      trimmed,
      MAX_MEDIUM,
    );
    questions.push(trimmed);
  }
  if (questions.length < options.minCount) {
    throw new Error(
      options.minCount === 1
        ? `${options.label}: minstens 1 interviewvraag vereist`
        : `${options.label}: te weinig interviewvragen`,
    );
  }
  if (questions.length > maxCount) {
    throw new Error(
      `${options.label}: max ${maxCount} interviewvragen`,
    );
  }
  return questions;
}

function asFactSource(value: unknown, label: string): "neon" | "convex" {
  if (value === "neon" || value === "convex") {
    return value;
  }
  throw new Error(`${label} source ongeldig`);
}

function asContactType(
  value: unknown,
  label: string,
): "player" | "staff" | "board" | "other" {
  if (
    value === "player" ||
    value === "staff" ||
    value === "board" ||
    value === "other"
  ) {
    return value;
  }
  throw new Error(`${label} contactType ongeldig`);
}

export function validateIdeaBatch(raw: unknown): IdeaBatchInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("IdeaBatch ontbreekt of is ongeldig");
  }
  const ideas = (raw as { ideas?: unknown }).ideas;
  if (!Array.isArray(ideas) || ideas.length !== 5) {
    throw new Error("IdeaBatch moet precies 5 ideeën bevatten");
  }

  const validated: IdeaProposalInput[] = ideas.map((idea, index) =>
    validateIdeaProposal(idea, index),
  );

  return { ideas: validated };
}

function validateIdeaProposal(raw: unknown, index: number): IdeaProposalInput {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Idee ${index + 1} is ongeldig`);
  }
  const idea = raw as Record<string, unknown>;
  const prefix = `Idee ${index + 1}`;

  if (typeof idea.ideaTitle !== "string") {
    throw new Error(`${prefix}: ideaTitle ontbreekt`);
  }
  assertLen(`${prefix}: ideaTitle`, idea.ideaTitle, MAX_SHORT);

  if (!Array.isArray(idea.titleProposals) || idea.titleProposals.length !== 3) {
    throw new Error(`${prefix}: precies 3 titelvoorstellen vereist`);
  }
  const titleProposals = idea.titleProposals.map((title, titleIndex) => {
    if (typeof title !== "string") {
      throw new Error(`${prefix}: titelvoorstel ${titleIndex + 1} ongeldig`);
    }
    assertLen(
      `${prefix}: titelvoorstel ${titleIndex + 1}`,
      title,
      MAX_SHORT,
    );
    return title;
  }) as [string, string, string];

  if (typeof idea.whyInteresting !== "string") {
    throw new Error(`${prefix}: whyInteresting ontbreekt`);
  }
  assertLen(`${prefix}: whyInteresting`, idea.whyInteresting, MAX_LONG);

  if (!Array.isArray(idea.supportingFacts) || idea.supportingFacts.length < 1) {
    throw new Error(`${prefix}: minstens 1 supportingFact vereist`);
  }
  if (idea.supportingFacts.length > 8) {
    throw new Error(`${prefix}: max 8 supportingFacts`);
  }
  const supportingFacts = idea.supportingFacts.map((fact, factIndex) => {
    if (!fact || typeof fact !== "object") {
      throw new Error(`${prefix}: feit ${factIndex + 1} ongeldig`);
    }
    const f = fact as Record<string, unknown>;
    if (typeof f.claim !== "string" || typeof f.evidence !== "string") {
      throw new Error(`${prefix}: feit ${factIndex + 1} mist claim/evidence`);
    }
    assertLen(`${prefix}: feit ${factIndex + 1} claim`, f.claim, MAX_MEDIUM);
    assertLen(`${prefix}: feit ${factIndex + 1} evidence`, f.evidence, MAX_LONG);
    const source = asFactSource(f.source, `${prefix}: feit ${factIndex + 1}`);
    return {
      claim: f.claim,
      evidence: f.evidence,
      source,
      ...(typeof f.sqlFingerprint === "string"
        ? { sqlFingerprint: f.sqlFingerprint.slice(0, 500) }
        : {}),
    };
  });

  if (!Array.isArray(idea.interviewees)) {
    throw new Error(`${prefix}: interviewees moet een array zijn`);
  }
  if (idea.interviewees.length > 3) {
    throw new Error(`${prefix}: max 3 interviewkandidaten`);
  }
  const interviewees = idea.interviewees.map((person, personIndex) => {
    if (!person || typeof person !== "object") {
      throw new Error(`${prefix}: kandidaat ${personIndex + 1} ongeldig`);
    }
    const p = person as Record<string, unknown>;
    const requiredStrings = [
      "neonPersonId",
      "fullName",
      "neonClubId",
      "clubName",
      "whyInterview",
    ] as const;
    for (const key of requiredStrings) {
      if (typeof p[key] !== "string" || (p[key] as string).trim().length === 0) {
        throw new Error(`${prefix}: kandidaat ${personIndex + 1} mist ${key}`);
      }
    }
    const contactType = asContactType(
      p.contactType,
      `${prefix}: kandidaat ${personIndex + 1}`,
    );
    assertLen(
      `${prefix}: kandidaat ${personIndex + 1} whyInterview`,
      p.whyInterview as string,
      MAX_MEDIUM,
    );
    const questions = normalizeInterviewQuestions(p.questions, {
      label: `${prefix}: kandidaat ${personIndex + 1}`,
      minCount: 1,
    });
    return {
      neonPersonId: p.neonPersonId as string,
      fullName: p.fullName as string,
      contactType,
      ...(typeof p.contactTypeDetail === "string"
        ? { contactTypeDetail: p.contactTypeDetail.slice(0, 120) }
        : {}),
      neonClubId: p.neonClubId as string,
      clubName: p.clubName as string,
      ...(typeof p.neonTeamId === "string" ? { neonTeamId: p.neonTeamId } : {}),
      ...(typeof p.teamName === "string" ? { teamName: p.teamName } : {}),
      whyInterview: p.whyInterview as string,
      questions,
    };
  });

  const seenPersonIds = new Set<string>();
  for (const person of interviewees) {
    if (seenPersonIds.has(person.neonPersonId)) {
      throw new Error(
        `${prefix}: dubbele interviewkandidaat (${person.neonPersonId})`,
      );
    }
    seenPersonIds.add(person.neonPersonId);
  }

  return {
    ideaTitle: idea.ideaTitle,
    titleProposals: [...titleProposals],
    whyInteresting: idea.whyInteresting,
    supportingFacts,
    interviewees,
    ...(typeof idea.researchSummary === "string"
      ? {
          researchSummary: (() => {
            assertLen(
              `${prefix}: researchSummary`,
              idea.researchSummary,
              MAX_LONG,
            );
            return idea.researchSummary;
          })(),
        }
      : {}),
  };
}

/** JSON Schema for Eve session `outputSchema` (English keys, Dutch describes omitted). */
export const ideaBatchJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "ideaTitle",
          "titleProposals",
          "whyInteresting",
          "supportingFacts",
          "interviewees",
        ],
        properties: {
          ideaTitle: { type: "string", minLength: 1, maxLength: MAX_SHORT },
          titleProposals: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "string", minLength: 1, maxLength: MAX_SHORT },
          },
          whyInteresting: { type: "string", minLength: 1, maxLength: MAX_LONG },
          supportingFacts: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["claim", "evidence", "source"],
              properties: {
                claim: { type: "string", minLength: 1, maxLength: MAX_MEDIUM },
                evidence: { type: "string", minLength: 1, maxLength: MAX_LONG },
                source: { type: "string", enum: ["neon", "convex"] },
                sqlFingerprint: { type: "string", maxLength: 500 },
              },
            },
          },
          interviewees: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "neonPersonId",
                "fullName",
                "contactType",
                "neonClubId",
                "clubName",
                "whyInterview",
                "questions",
              ],
              properties: {
                neonPersonId: { type: "string", minLength: 1, maxLength: 128 },
                fullName: { type: "string", minLength: 1, maxLength: 200 },
                contactType: {
                  type: "string",
                  enum: ["player", "staff", "board", "other"],
                },
                contactTypeDetail: { type: "string", maxLength: 120 },
                neonClubId: { type: "string", minLength: 1, maxLength: 128 },
                clubName: { type: "string", minLength: 1, maxLength: 200 },
                neonTeamId: { type: "string", maxLength: 128 },
                teamName: { type: "string", maxLength: 200 },
                whyInterview: {
                  type: "string",
                  minLength: 1,
                  maxLength: MAX_MEDIUM,
                },
                questions: {
                  type: "array",
                  minItems: 1,
                  maxItems: MAX_INTERVIEW_QUESTIONS,
                  items: {
                    type: "string",
                    minLength: 1,
                    maxLength: MAX_MEDIUM,
                  },
                },
              },
            },
          },
          researchSummary: { type: "string", maxLength: MAX_LONG },
        },
      },
    },
  },
} as const;
