import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { IdeaProposalInput } from "./pipelineValidators";

export async function upsertContactFromInterviewee(
  ctx: MutationCtx,
  args: {
    interviewee: IdeaProposalInput["interviewees"][number];
    divisionKey: string;
    now: number;
  },
): Promise<Id<"contacts">> {
  const { interviewee, divisionKey, now } = args;
  const existing = await ctx.db
    .query("contacts")
    .withIndex("by_neon_person", (q) =>
      q.eq("neonPersonId", interviewee.neonPersonId),
    )
    .unique();

  if (existing) {
    const divisionKeys = existing.divisionKeys.includes(divisionKey)
      ? existing.divisionKeys
      : [...existing.divisionKeys, divisionKey];
    await ctx.db.patch(existing._id, {
      fullName: interviewee.fullName,
      contactType: interviewee.contactType,
      contactTypeDetail: interviewee.contactTypeDetail,
      neonClubId: interviewee.neonClubId,
      clubName: interviewee.clubName,
      neonTeamId: interviewee.neonTeamId,
      teamName: interviewee.teamName,
      divisionKeys,
      lastSeenAt: now,
      updatedAt: now,
      isActive: true,
      // never wipe notes / channel fields
    });
    return existing._id;
  }

  return await ctx.db.insert("contacts", {
    neonPersonId: interviewee.neonPersonId,
    fullName: interviewee.fullName,
    contactType: interviewee.contactType,
    contactTypeDetail: interviewee.contactTypeDetail,
    neonClubId: interviewee.neonClubId,
    clubName: interviewee.clubName,
    neonTeamId: interviewee.neonTeamId,
    teamName: interviewee.teamName,
    divisionKeys: [divisionKey],
    isActive: true,
    source: "research_agent",
    firstSeenAt: now,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  });
}
