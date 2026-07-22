/**
 * Lightweight heuristic: string fields in IdeaBatch should look Dutch.
 * Not a full language detector — catches obvious English-only / empty junk.
 */

const DUTCH_MARKERS =
  /\b(de|het|een|van|voor|met|niet|ook|nog|naar|bij|uit|aan|op|te|zijn|wordt|werd|tegen|seizoen|wedstrijd|doelpunten|doelpunt|trainer|speler|club|reeks|provinciale|kampioen|degradatie|play-offs|stand|punten|die|hoe|wie|wat|na|tot|in|om|over|achter|nu|dan|meer|meeste|minste|laatste|eerste|deze|die|dit|dat|geen|wel|als|kan|kunnen|moet|zou|naar|per|tussen)\b/i;

/** Strong English function words / sports jargon that shouldn't dominate Dutch copy. */
const ENGLISH_ONLY_MARKERS =
  /\b(the|and|with|without|because|however|season|match|coach|player|division|champion|relegation|although|which|their|there|these|those)\b/i;

export function looksDutch(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) {
    return false;
  }

  // Accented letters common in Dutch / Flemish names & copy.
  if (/[àáâäèéêëìíîïòóôöùúûüÿñç]/i.test(trimmed)) {
    return true;
  }

  const dutchHits =
    trimmed.match(new RegExp(DUTCH_MARKERS.source, "gi"))?.length ?? 0;
  const englishHits =
    trimmed.match(new RegExp(ENGLISH_ONLY_MARKERS.source, "gi"))?.length ?? 0;

  if (dutchHits >= 1 && dutchHits >= englishHits) {
    return true;
  }

  // Short titles may lack function words or include loanwords (goals, ranking).
  if (trimmed.split(/\s+/).length <= 10 && englishHits === 0) {
    return true;
  }

  // Loanword-only titles still count as Dutch when they contain Dutch morphology
  // markers (-en plurals / past participles) and no strong English grammar.
  if (
    englishHits === 0 &&
    /\b\w+(en|eld|igheid|ingen)\b/i.test(trimmed) &&
    dutchHits === 0
  ) {
    return true;
  }

  return dutchHits > englishHits;
}

export function ideaBatchLooksDutch(batch: {
  ideas: Array<{
    ideaTitle: string;
    titleProposals: readonly [string, string, string];
    whyInteresting: string;
    supportingFacts: Array<{ claim: string; evidence: string }>;
    interviewees: Array<{
      whyInterview: string;
      fullName: string;
      interviewerNotes?: string;
      questions?: string[];
    }>;
    researchSummary?: string;
  }>;
}): { ok: boolean; failures: string[] } {
  const failures: string[] = [];

  batch.ideas.forEach((idea, index) => {
    const prefix = `ideas[${index}]`;
    if (!looksDutch(idea.ideaTitle)) {
      failures.push(`${prefix}.ideaTitle`);
    }
    idea.titleProposals.forEach((title, titleIndex) => {
      if (!looksDutch(title)) {
        failures.push(`${prefix}.titleProposals[${titleIndex}]`);
      }
    });
    if (!looksDutch(idea.whyInteresting)) {
      failures.push(`${prefix}.whyInteresting`);
    }
    idea.supportingFacts.forEach((fact, factIndex) => {
      if (!looksDutch(fact.claim)) {
        failures.push(`${prefix}.supportingFacts[${factIndex}].claim`);
      }
    });
    idea.interviewees.forEach((person, personIndex) => {
      if (!looksDutch(person.whyInterview)) {
        failures.push(`${prefix}.interviewees[${personIndex}].whyInterview`);
      }
      if (person.interviewerNotes && !looksDutch(person.interviewerNotes)) {
        failures.push(
          `${prefix}.interviewees[${personIndex}].interviewerNotes`,
        );
      }
      (person.questions ?? []).forEach((question, questionIndex) => {
        if (!looksDutch(question)) {
          failures.push(
            `${prefix}.interviewees[${personIndex}].questions[${questionIndex}]`,
          );
        }
      });
    });
    if (idea.researchSummary && !looksDutch(idea.researchSummary)) {
      failures.push(`${prefix}.researchSummary`);
    }
  });

  return { ok: failures.length === 0, failures };
}
