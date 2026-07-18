import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { COMPLIANCE } from "./compliance";
import { describeAudience } from "./emailRender";

type AnyCtx = QueryCtx | MutationCtx;

export function isSendingDomainVerified(fromAddress: string): boolean {
  const domain = fromAddress.split("@")[1]?.toLowerCase();
  return domain === COMPLIANCE.sendingDomain;
}

export async function getDefaultSender(
  ctx: AnyCtx,
): Promise<Doc<"emailSenderProfiles">> {
  const existing = await ctx.db
    .query("emailSenderProfiles")
    .withIndex("by_default", (q) => q.eq("isDefault", true))
    .unique();
  if (existing) {
    return existing;
  }
  throw new Error(
    "Geen standaard afzender geconfigureerd. Open e-mailinstellingen eerst.",
  );
}

export async function ensureDefaultSender(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"emailSenderProfiles">> {
  try {
    return await getDefaultSender(ctx);
  } catch {
    const now = Date.now();
    const id = await ctx.db.insert("emailSenderProfiles", {
      internalName: "Standaard",
      fromName: COMPLIANCE.defaultFromName,
      fromAddress: COMPLIANCE.defaultFromAddress,
      replyTo: COMPLIANCE.replyTo,
      isDefault: true,
      domainVerified: isSendingDomainVerified(COMPLIANCE.defaultFromAddress),
      createdBy: userId,
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error("Afzender kon niet worden aangemaakt.");
    }
    return created;
  }
}

export async function audienceDescription(
  ctx: AnyCtx,
  definition: Doc<"newsletterAudienceDefinitions">,
): Promise<string> {
  const divisionLabels: string[] = [];
  for (const divisionId of definition.divisionIds) {
    const division = await ctx.db.get(divisionId);
    if (division) {
      divisionLabels.push(division.label);
    }
  }
  const teamLabels: string[] = [];
  for (const teamId of definition.favoriteTeamIds) {
    const team = await ctx.db.get(teamId);
    if (team) {
      teamLabels.push(team.label);
    }
  }
  return describeAudience({ divisionLabels, teamLabels });
}

export async function audit(
  ctx: MutationCtx,
  args: {
    action: Doc<"newsletterAuditEvents">["action"];
    actorUserId?: Id<"users">;
    campaignId?: Id<"newsletterCampaigns">;
    sendId?: Id<"newsletterSends">;
    metadata?: string;
  },
): Promise<void> {
  await ctx.db.insert("newsletterAuditEvents", {
    action: args.action,
    actorUserId: args.actorUserId,
    campaignId: args.campaignId,
    sendId: args.sendId,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}

export function siteBaseUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/u, "");
}
