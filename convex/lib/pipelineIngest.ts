import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { upsertContactFromInterviewee } from "./pipelineContacts";
import type { IdeaBatchInput } from "./pipelineValidators";

/** All-or-nothing ingest of a validated IdeaBatch into pipeline tables. */
export async function ingestIdeaBatch(
  ctx: MutationCtx,
  args: {
    runId: Id<"pipelineResearchRuns">;
    divisionKey: string;
    batch: IdeaBatchInput;
    actorUserId?: Id<"users">;
  },
): Promise<Id<"pipelineArticles">[]> {
  const now = Date.now();
  const ideaIds: Id<"pipelineArticles">[] = [];

  for (const idea of args.batch.ideas) {
    const articleId = await ctx.db.insert("pipelineArticles", {
      divisionKey: args.divisionKey,
      phase: "idea_review",
      researchRunId: args.runId,
      ideaTitle: idea.ideaTitle,
      titleProposals: idea.titleProposals,
      whyInteresting: idea.whyInteresting,
      supportingFacts: idea.supportingFacts,
      researchSummary: idea.researchSummary,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    ideaIds.push(articleId);

    await ctx.db.insert("pipelineEvents", {
      articleId,
      researchRunId: args.runId,
      type: "created",
      actorUserId: args.actorUserId,
      createdAt: now,
    });

    for (const [order, interviewee] of idea.interviewees.entries()) {
      const contactId = await upsertContactFromInterviewee(ctx, {
        interviewee,
        divisionKey: args.divisionKey,
        now,
      });
      await ctx.db.insert("pipelineArticleContacts", {
        articleId,
        contactId,
        neonPersonId: interviewee.neonPersonId,
        whyInterview: interviewee.whyInterview,
        questions: interviewee.questions,
        suggestedOrder: order,
        selected: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return ideaIds;
}
