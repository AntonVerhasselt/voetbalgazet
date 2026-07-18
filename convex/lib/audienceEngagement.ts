import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { AudienceCondition, AudienceRuleGroup } from "./audienceRules";

type AnyCtx = QueryCtx | MutationCtx;

const ENGAGEMENT_EVENT: Record<"opened" | "clicked", string> = {
  opened: "email.opened",
  clicked: "email.clicked",
};

export type AudienceEngagementContext = {
  /** `${operator}:${campaignId}` → subscriber ids that match */
  campaignMatches: Map<string, Set<string>>;
};

function campaignKey(
  operator: "received" | "opened" | "clicked",
  campaignId: Id<"newsletterCampaigns">,
): string {
  return `${operator}:${campaignId}`;
}

function collectCampaignEngagementNeeds(
  ruleGroups: AudienceRuleGroup[],
): Array<{
  operator: "received" | "opened" | "clicked";
  campaignId: Id<"newsletterCampaigns">;
}> {
  const needs: Array<{
    operator: "received" | "opened" | "clicked";
    campaignId: Id<"newsletterCampaigns">;
  }> = [];
  const seen = new Set<string>();
  for (const group of ruleGroups) {
    for (const condition of group.conditions) {
      if (condition.field !== "email_campaign") {
        continue;
      }
      for (const campaignId of condition.campaignIds) {
        const key = campaignKey(condition.operator, campaignId);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        needs.push({ operator: condition.operator, campaignId });
      }
    }
  }
  return needs;
}

async function subscriberIdsForReceivedCampaign(
  ctx: AnyCtx,
  campaignId: Id<"newsletterCampaigns">,
): Promise<Set<string>> {
  const matched = new Set<string>();
  const sends = await ctx.db
    .query("newsletterSends")
    .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
    .take(50);
  for (const send of sends) {
    // Delivered = “received”; also include sent as a soft fallback when
    // webhooks are incomplete but the mail left the queue.
    for (const status of ["delivered", "sent"] as const) {
      const page = await ctx.db
        .query("newsletterRecipients")
        .withIndex("by_send_and_status", (q) =>
          q.eq("sendId", send._id).eq("status", status),
        )
        .take(2000);
      for (const recipient of page) {
        matched.add(recipient.subscriberId);
      }
    }
  }
  return matched;
}

async function subscriberIdsForEngagementEvent(
  ctx: AnyCtx,
  campaignId: Id<"newsletterCampaigns">,
  operator: "opened" | "clicked",
): Promise<Set<string>> {
  const matched = new Set<string>();
  const eventType = ENGAGEMENT_EVENT[operator];
  const sends = await ctx.db
    .query("newsletterSends")
    .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
    .take(50);
  const recipientCache = new Map<string, Id<"subscribers"> | null>();
  for (const send of sends) {
    const events = await ctx.db
      .query("newsletterDeliveryEvents")
      .withIndex("by_send_and_eventType", (q) =>
        q.eq("sendId", send._id).eq("eventType", eventType),
      )
      .take(4000);
    for (const event of events) {
      let subscriberId = recipientCache.get(event.recipientId);
      if (subscriberId === undefined) {
        const recipient = await ctx.db.get(event.recipientId);
        subscriberId = recipient?.subscriberId ?? null;
        recipientCache.set(event.recipientId, subscriberId);
      }
      if (subscriberId) {
        matched.add(subscriberId);
      }
    }
  }
  return matched;
}

/** Preload campaign engagement sets used by rule evaluation. */
export async function buildAudienceEngagementContext(
  ctx: AnyCtx,
  ruleGroups: AudienceRuleGroup[],
): Promise<AudienceEngagementContext> {
  const campaignMatches = new Map<string, Set<string>>();
  const needs = collectCampaignEngagementNeeds(ruleGroups);
  for (const need of needs) {
    const key = campaignKey(need.operator, need.campaignId);
    if (need.operator === "received") {
      campaignMatches.set(
        key,
        await subscriberIdsForReceivedCampaign(ctx, need.campaignId),
      );
    } else {
      campaignMatches.set(
        key,
        await subscriberIdsForEngagementEvent(
          ctx,
          need.campaignId,
          need.operator,
        ),
      );
    }
  }
  return { campaignMatches };
}

export function emptyEngagementContext(): AudienceEngagementContext {
  return { campaignMatches: new Map() };
}

export function subscriberMatchesCampaignEngagement(
  subscriberId: Id<"subscribers">,
  condition: Extract<AudienceCondition, { field: "email_campaign" }>,
  context: AudienceEngagementContext,
): boolean {
  if (condition.campaignIds.length === 0) {
    return false;
  }
  return condition.campaignIds.some((campaignId) => {
    const set = context.campaignMatches.get(
      campaignKey(condition.operator, campaignId),
    );
    return set?.has(subscriberId) ?? false;
  });
}

export function subscriberMatchesEmailActivity(
  subscriber: {
    lastEmailDeliveredAt?: number;
    lastEmailOpenedAt?: number;
    lastEmailClickedAt?: number;
  },
  condition: Extract<AudienceCondition, { field: "email_activity" }>,
): boolean {
  const timestamp =
    condition.operator === "received"
      ? subscriber.lastEmailDeliveredAt
      : condition.operator === "opened"
        ? subscriber.lastEmailOpenedAt
        : subscriber.lastEmailClickedAt;
  if (timestamp === undefined) {
    return false;
  }
  return condition.relative === "after"
    ? timestamp >= condition.at
    : timestamp <= condition.at;
}
