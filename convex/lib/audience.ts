import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

export type AudienceFilter = {
  newsletterSubscribedOnly: boolean;
  divisionIds?: Id<"divisions">[];
  favoriteTeamIds?: Id<"teams">[];
  matchMode?: "any" | "all";
};

export function matchesAudienceFilter(
  subscriber: Doc<"subscribers">,
  filter: AudienceFilter,
): boolean {
  if (filter.newsletterSubscribedOnly && !subscriber.newsletterSubscribed) {
    return false;
  }

  if (subscriber.unsubscribedAt !== undefined) {
    return false;
  }

  if (subscriber.emailDeliveryStatus === "bounced") {
    return false;
  }

  const divisionIds = filter.divisionIds ?? [];
  const favoriteTeamIds = filter.favoriteTeamIds ?? [];

  if (divisionIds.length === 0 && favoriteTeamIds.length === 0) {
    return true;
  }

  const matchMode = filter.matchMode ?? "any";
  const divisionMatch =
    divisionIds.length === 0 ||
    (matchMode === "all"
      ? divisionIds.every((id) => subscriber.divisionIds.includes(id))
      : divisionIds.some((id) => subscriber.divisionIds.includes(id)));

  const teamMatch =
    favoriteTeamIds.length === 0 ||
    (subscriber.favoriteTeamId !== undefined &&
      favoriteTeamIds.includes(subscriber.favoriteTeamId));

  if (divisionIds.length > 0 && favoriteTeamIds.length > 0) {
    return divisionMatch && teamMatch;
  }

  return divisionMatch || teamMatch;
}

export async function countAudience(
  ctx: QueryCtx,
  filter: AudienceFilter,
): Promise<number> {
  const subscribers = await ctx.db
    .query("subscribers")
    .withIndex("by_newsletter_subscribed", (q) =>
      q.eq("newsletterSubscribed", true),
    )
    .collect();

  return subscribers.filter((s) => matchesAudienceFilter(s, filter)).length;
}

export async function getAudienceSubscribers(
  ctx: QueryCtx,
  filter: AudienceFilter,
): Promise<Doc<"subscribers">[]> {
  const subscribers = await ctx.db
    .query("subscribers")
    .withIndex("by_newsletter_subscribed", (q) =>
      q.eq("newsletterSubscribed", true),
    )
    .collect();

  return subscribers.filter((s) => matchesAudienceFilter(s, filter));
}
