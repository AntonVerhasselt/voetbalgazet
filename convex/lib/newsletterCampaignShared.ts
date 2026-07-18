import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  describeAudienceRules,
  resolveRuleGroups,
  type DivisionMeta,
} from "./audienceRules";
import { COMPLIANCE } from "./compliance";

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

export async function loadDivisionMeta(
  ctx: AnyCtx,
): Promise<Map<string, DivisionMeta>> {
  const divisions = await ctx.db.query("divisions").take(500);
  const map = new Map<string, DivisionMeta>();
  for (const division of divisions) {
    map.set(division._id, {
      _id: division._id,
      label: division.label,
      provinceKey: division.provinceKey,
      level: division.level,
    });
  }
  return map;
}

export async function audienceDescription(
  ctx: AnyCtx,
  definition: Doc<"newsletterAudienceDefinitions">,
): Promise<string> {
  const ruleGroups = resolveRuleGroups(definition);
  const divisions = await ctx.db.query("divisions").take(500);
  const teams = await ctx.db.query("teams").take(500);
  const campaigns = await ctx.db
    .query("newsletterCampaigns")
    .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "sent"))
    .order("desc")
    .take(80);
  const partial = await ctx.db
    .query("newsletterCampaigns")
    .withIndex("by_status_and_updatedAt", (q) =>
      q.eq("status", "partially_failed"),
    )
    .order("desc")
    .take(20);
  const campaignDocs = [...campaigns, ...partial];
  return describeAudienceRules({
    ruleGroups,
    divisions: divisions.map((division) => ({
      _id: division._id,
      label: division.label,
      provinceKey: division.provinceKey,
      level: division.level,
    })),
    teams: teams.map((team) => ({
      _id: team._id,
      label: team.label,
    })),
    campaigns: campaignDocs.map((campaign) => ({
      _id: campaign._id,
      label: campaign.internalName || campaign.subject || "Nieuwsbrief",
    })),
  });
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
