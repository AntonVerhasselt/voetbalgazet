import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { buildAudienceEngagementContext } from "./audienceEngagement";
import {
  deriveLegacyFilters,
  describeAudienceRules,
  resolveRuleGroups,
  subscriberMatchesRuleGroups,
  validateRuleGroups,
  type AudienceRuleGroup,
} from "./audienceRules";
import { loadDivisionMeta } from "./newsletterCampaignShared";
import { hasActiveSuppression } from "./suppressions";

/** Cap full-list preview scans so large lists do not time out the query. */
export const AUDIENCE_PREVIEW_SCAN_CAP = 2_000;

export type AudiencePreviewResult = {
  eligibleBeforeFilters: number;
  eligibleAfterFilters: number;
  excludedUnsubscribe: number;
  excludedSuppression: number;
  excludedDivisionFilter: number;
  excludedTeamFilter: number;
  percentOfActive: number;
  calculatedAt: number;
  description: string;
  isApproximate: boolean;
  sample: Array<{
    maskedEmail: string;
    divisionLabels: string[];
    teamLabel: string | null;
  }>;
};

export async function computeAudiencePreview(
  ctx: QueryCtx,
  definition: Doc<"newsletterAudienceDefinitions">,
  now: number,
  draftRuleGroups?: AudienceRuleGroup[],
): Promise<AudiencePreviewResult> {
  const ruleGroups =
    draftRuleGroups !== undefined
      ? draftRuleGroups
      : resolveRuleGroups(definition);
  if (draftRuleGroups !== undefined) {
    // Soft-validate: empty value lists just match nobody in evaluate.
    try {
      validateRuleGroups(draftRuleGroups);
    } catch {
      // Incomplete draft rules — still preview with current evaluate semantics.
    }
  }
  const divisionMetaById = await loadDivisionMeta(ctx);
  const legacy = deriveLegacyFilters(ruleGroups);
  const engagement = await buildAudienceEngagementContext(ctx, ruleGroups);

  const subscribedSampleSource: Doc<"subscribers">[] = [];
  let cursor: string | null = null;
  let isDone = false;
  let excludedUnsubscribe = 0;
  let excludedSuppression = 0;
  let excludedDivisionFilter = 0;
  let excludedTeamFilter = 0;
  let eligibleCount = 0;
  let scanned = 0;
  let isApproximate = false;

  const considerSubscriber = async (subscriber: Doc<"subscribers">) => {
    if (!subscriber.newsletterSubscribed) {
      return;
    }
    if (subscriber.unsubscribedAt !== undefined) {
      excludedUnsubscribe += 1;
      return;
    }
    if (
      await hasActiveSuppression(ctx, {
        subscriberId: subscriber._id,
        normalizedEmail: subscriber.normalizedEmail,
      })
    ) {
      excludedSuppression += 1;
      return;
    }
    if (
      !subscriberMatchesRuleGroups(
        {
          _id: subscriber._id,
          divisionIds: subscriber.divisionIds,
          favoriteTeamId: subscriber.favoriteTeamId,
          newsletterSubscribedAt: subscriber.newsletterSubscribedAt,
          lastEmailDeliveredAt: subscriber.lastEmailDeliveredAt,
          lastEmailOpenedAt: subscriber.lastEmailOpenedAt,
          lastEmailClickedAt: subscriber.lastEmailClickedAt,
        },
        ruleGroups,
        divisionMetaById,
        now,
        engagement,
      )
    ) {
      // Keep legacy exclusion counters informative for simple filters.
      if (legacy.divisionIds.length > 0) {
        const divisionMatch = subscriber.divisionIds.some((id) =>
          legacy.divisionIds.includes(id),
        );
        if (!divisionMatch) {
          excludedDivisionFilter += 1;
          return;
        }
      }
      if (legacy.favoriteTeamIds.length > 0) {
        excludedTeamFilter += 1;
        return;
      }
      excludedDivisionFilter += 1;
      return;
    }
    eligibleCount += 1;
    if (subscribedSampleSource.length < 20) {
      subscribedSampleSource.push(subscriber);
    }
  };

  // Prefer division projection when a simple reeksfilter is the only path.
  if (legacy.divisionIds.length > 0 && ruleGroups.length === 1) {
    const seen = new Set<string>();
    for (const divisionId of legacy.divisionIds) {
      let divisionCursor: string | null = null;
      let divisionDone = false;
      while (!divisionDone && scanned < AUDIENCE_PREVIEW_SCAN_CAP) {
        const remaining = AUDIENCE_PREVIEW_SCAN_CAP - scanned;
        const preferencePage = await ctx.db
          .query("subscriberDivisionPreferences")
          .withIndex("by_division_and_subscriber", (q) =>
            q.eq("divisionId", divisionId),
          )
          .paginate({
            numItems: Math.min(500, remaining),
            cursor: divisionCursor,
          });
        for (const preference of preferencePage.page) {
          scanned += 1;
          if (seen.has(preference.subscriberId)) {
            continue;
          }
          seen.add(preference.subscriberId);
          const subscriber = await ctx.db.get(preference.subscriberId);
          if (subscriber) {
            await considerSubscriber(subscriber);
          }
        }
        divisionDone = preferencePage.isDone;
        divisionCursor = preferencePage.isDone
          ? null
          : preferencePage.continueCursor;
        if (!preferencePage.isDone && scanned >= AUDIENCE_PREVIEW_SCAN_CAP) {
          isApproximate = true;
        }
      }
      if (scanned >= AUDIENCE_PREVIEW_SCAN_CAP) {
        isApproximate = true;
        break;
      }
    }
  } else {
    while (!isDone && scanned < AUDIENCE_PREVIEW_SCAN_CAP) {
      const remaining = AUDIENCE_PREVIEW_SCAN_CAP - scanned;
      const page = await ctx.db
        .query("subscribers")
        .withIndex("by_newsletter_subscribed", (q) =>
          q.eq("newsletterSubscribed", true),
        )
        .paginate({
          numItems: Math.min(500, remaining),
          cursor,
        });
      for (const subscriber of page.page) {
        scanned += 1;
        await considerSubscriber(subscriber);
      }
      isDone = page.isDone;
      cursor = page.isDone ? null : page.continueCursor;
      if (!page.isDone && scanned >= AUDIENCE_PREVIEW_SCAN_CAP) {
        isApproximate = true;
      }
    }
  }

  const sample = [];
  for (const subscriber of subscribedSampleSource) {
    const divisionLabels: string[] = [];
    for (const divisionId of subscriber.divisionIds) {
      const division = await ctx.db.get(divisionId);
      if (division) {
        divisionLabels.push(division.label);
      }
    }
    const team = subscriber.favoriteTeamId
      ? await ctx.db.get(subscriber.favoriteTeamId)
      : null;
    const [local, domain] = subscriber.normalizedEmail.split("@");
    sample.push({
      maskedEmail: `${(local ?? "*").slice(0, 1)}***@${domain ?? "***"}`,
      divisionLabels,
      teamLabel: team?.label ?? null,
    });
  }

  const eligibleBeforeFilters =
    eligibleCount + excludedDivisionFilter + excludedTeamFilter;
  const percentOfActive =
    eligibleBeforeFilters === 0
      ? 0
      : Math.round((eligibleCount / eligibleBeforeFilters) * 1000) / 10;

  const divisions = [...divisionMetaById.values()];
  const teams = await ctx.db.query("teams").take(500);
  const sentCampaigns = await ctx.db
    .query("newsletterCampaigns")
    .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "sent"))
    .order("desc")
    .take(80);
  const description = describeAudienceRules({
    ruleGroups,
    divisions,
    teams: teams.map((team) => ({
      _id: team._id,
      label: team.label,
    })),
    campaigns: sentCampaigns.map((campaign) => ({
      _id: campaign._id,
      label: campaign.internalName || campaign.subject || "Nieuwsbrief",
    })),
  });

  return {
    eligibleBeforeFilters,
    eligibleAfterFilters: eligibleCount,
    excludedUnsubscribe,
    excludedSuppression,
    excludedDivisionFilter,
    excludedTeamFilter,
    percentOfActive,
    calculatedAt: now,
    description,
    isApproximate,
    sample,
  };
}
