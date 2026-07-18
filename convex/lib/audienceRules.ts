import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { provinceOptions } from "./preferenceCatalog";
import {
  emptyEngagementContext,
  subscriberMatchesCampaignEngagement,
  subscriberMatchesEmailActivity,
  type AudienceEngagementContext,
} from "./audienceEngagement";

/** Relative time units for "subscribed within" filters. */
export const audienceTimeUnitValidator = v.union(
  v.literal("days"),
  v.literal("weeks"),
  v.literal("months"),
);

export const audienceEngagementOperatorValidator = v.union(
  v.literal("received"),
  v.literal("opened"),
  v.literal("clicked"),
);

export const audienceConditionValidator = v.union(
  v.object({
    id: v.string(),
    field: v.literal("division"),
    operator: v.literal("any_of"),
    divisionIds: v.array(v.id("divisions")),
  }),
  v.object({
    id: v.string(),
    field: v.literal("province"),
    operator: v.literal("any_of"),
    provinceKeys: v.array(v.string()),
  }),
  v.object({
    id: v.string(),
    field: v.literal("division_level"),
    operator: v.literal("any_of"),
    levels: v.array(v.number()),
  }),
  v.object({
    id: v.string(),
    field: v.literal("favorite_team"),
    operator: v.literal("any_of"),
    teamIds: v.array(v.id("teams")),
  }),
  v.object({
    id: v.string(),
    field: v.literal("has_favorite_team"),
    operator: v.literal("eq"),
    value: v.boolean(),
  }),
  v.object({
    id: v.string(),
    field: v.literal("subscribed_within"),
    operator: v.literal("in_the_last"),
    amount: v.number(),
    unit: audienceTimeUnitValidator,
  }),
  v.object({
    id: v.string(),
    field: v.literal("email_campaign"),
    operator: audienceEngagementOperatorValidator,
    campaignIds: v.array(v.id("newsletterCampaigns")),
  }),
  v.object({
    id: v.string(),
    field: v.literal("email_activity"),
    operator: audienceEngagementOperatorValidator,
    relative: v.union(v.literal("after"), v.literal("before")),
    at: v.number(),
  }),
);

export const audienceRuleGroupValidator = v.object({
  id: v.string(),
  conditions: v.array(audienceConditionValidator),
});

export type AudienceCondition =
  | {
      id: string;
      field: "division";
      operator: "any_of";
      divisionIds: Id<"divisions">[];
    }
  | {
      id: string;
      field: "province";
      operator: "any_of";
      provinceKeys: string[];
    }
  | {
      id: string;
      field: "division_level";
      operator: "any_of";
      levels: number[];
    }
  | {
      id: string;
      field: "favorite_team";
      operator: "any_of";
      teamIds: Id<"teams">[];
    }
  | {
      id: string;
      field: "has_favorite_team";
      operator: "eq";
      value: boolean;
    }
  | {
      id: string;
      field: "subscribed_within";
      operator: "in_the_last";
      amount: number;
      unit: "days" | "weeks" | "months";
    }
  | {
      id: string;
      field: "email_campaign";
      operator: "received" | "opened" | "clicked";
      campaignIds: Id<"newsletterCampaigns">[];
    }
  | {
      id: string;
      field: "email_activity";
      operator: "received" | "opened" | "clicked";
      relative: "after" | "before";
      at: number;
    };

export type AudienceRuleGroup = {
  id: string;
  conditions: AudienceCondition[];
};

export type DivisionMeta = {
  _id: Id<"divisions">;
  label: string;
  provinceKey: string;
  level: number;
};

export type TeamMeta = {
  _id: Id<"teams">;
  label: string;
};

export type CampaignMeta = {
  _id: Id<"newsletterCampaigns">;
  label: string;
};

export type AudienceSubscriberSnapshot = {
  _id?: Id<"subscribers">;
  divisionIds: Id<"divisions">[];
  favoriteTeamId?: Id<"teams">;
  newsletterSubscribedAt?: number;
  lastEmailDeliveredAt?: number;
  lastEmailOpenedAt?: number;
  lastEmailClickedAt?: number;
};

const PROVINCE_LABEL_BY_KEY: Map<string, string> = new Map(
  provinceOptions.map((province) => [province.key, province.label]),
);

const LEVEL_LABELS: Record<number, string> = {
  1: "1ste provinciale",
  2: "2de provinciale",
  3: "3de provinciale",
};

export function newRuleId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyRuleGroups(): AudienceRuleGroup[] {
  return [];
}

/** Convert legacy flat filters into one AND group (OR within each dimension). */
export function legacyToRuleGroups(args: {
  divisionIds: Id<"divisions">[];
  favoriteTeamIds: Id<"teams">[];
}): AudienceRuleGroup[] {
  const conditions: AudienceCondition[] = [];
  if (args.divisionIds.length > 0) {
    conditions.push({
      id: newRuleId("cond"),
      field: "division",
      operator: "any_of",
      divisionIds: [...args.divisionIds],
    });
  }
  if (args.favoriteTeamIds.length > 0) {
    conditions.push({
      id: newRuleId("cond"),
      field: "favorite_team",
      operator: "any_of",
      teamIds: [...args.favoriteTeamIds],
    });
  }
  if (conditions.length === 0) {
    return [];
  }
  return [{ id: newRuleId("group"), conditions }];
}

/**
 * Source of truth for matching: stored ruleGroups when present,
 * otherwise derived from legacy divisionIds / favoriteTeamIds.
 */
export function resolveRuleGroups(definition: {
  ruleGroups?: AudienceRuleGroup[];
  divisionIds: Id<"divisions">[];
  favoriteTeamIds: Id<"teams">[];
}): AudienceRuleGroup[] {
  if (definition.ruleGroups !== undefined) {
    return definition.ruleGroups;
  }
  return legacyToRuleGroups({
    divisionIds: definition.divisionIds,
    favoriteTeamIds: definition.favoriteTeamIds,
  });
}

/**
 * Keep legacy columns in sync for simple single-group division/team rules
 * so existing indexed candidate paths still work.
 */
export function deriveLegacyFilters(ruleGroups: AudienceRuleGroup[]): {
  divisionIds: Id<"divisions">[];
  favoriteTeamIds: Id<"teams">[];
} {
  if (ruleGroups.length === 0) {
    return { divisionIds: [], favoriteTeamIds: [] };
  }
  if (ruleGroups.length !== 1) {
    return { divisionIds: [], favoriteTeamIds: [] };
  }
  const group = ruleGroups[0];
  if (!group) {
    return { divisionIds: [], favoriteTeamIds: [] };
  }
  let divisionIds: Id<"divisions">[] = [];
  let favoriteTeamIds: Id<"teams">[] = [];
  for (const condition of group.conditions) {
    if (condition.field === "division" && condition.operator === "any_of") {
      if (divisionIds.length > 0) {
        return { divisionIds: [], favoriteTeamIds: [] };
      }
      divisionIds = [...condition.divisionIds];
      continue;
    }
    if (
      condition.field === "favorite_team" &&
      condition.operator === "any_of"
    ) {
      if (favoriteTeamIds.length > 0) {
        return { divisionIds: [], favoriteTeamIds: [] };
      }
      favoriteTeamIds = [...condition.teamIds];
      continue;
    }
    // Province / level / boolean / time filters are not legacy-expressible.
    return { divisionIds: [], favoriteTeamIds: [] };
  }
  return { divisionIds, favoriteTeamIds };
}

export function durationMs(
  amount: number,
  unit: "days" | "weeks" | "months",
): number {
  const safeAmount = Math.max(0, Math.floor(amount));
  switch (unit) {
    case "days":
      return safeAmount * 24 * 60 * 60 * 1000;
    case "weeks":
      return safeAmount * 7 * 24 * 60 * 60 * 1000;
    case "months":
      return safeAmount * 30 * 24 * 60 * 60 * 1000;
  }
}

export function evaluateCondition(
  condition: AudienceCondition,
  subscriber: AudienceSubscriberSnapshot,
  divisionMetaById: Map<string, DivisionMeta>,
  now: number,
  engagement: AudienceEngagementContext = emptyEngagementContext(),
): boolean {
  switch (condition.field) {
    case "division": {
      const wanted = new Set(condition.divisionIds);
      if (wanted.size === 0) {
        return false;
      }
      return subscriber.divisionIds.some((id) => wanted.has(id));
    }
    case "province": {
      const wanted = new Set(condition.provinceKeys);
      if (wanted.size === 0) {
        return false;
      }
      return subscriber.divisionIds.some((id) => {
        const meta = divisionMetaById.get(id);
        return meta !== undefined && wanted.has(meta.provinceKey);
      });
    }
    case "division_level": {
      const wanted = new Set(condition.levels);
      if (wanted.size === 0) {
        return false;
      }
      return subscriber.divisionIds.some((id) => {
        const meta = divisionMetaById.get(id);
        return meta !== undefined && wanted.has(meta.level);
      });
    }
    case "favorite_team": {
      const wanted = new Set(condition.teamIds);
      if (wanted.size === 0) {
        return false;
      }
      return (
        subscriber.favoriteTeamId !== undefined &&
        wanted.has(subscriber.favoriteTeamId)
      );
    }
    case "has_favorite_team": {
      const hasTeam = subscriber.favoriteTeamId !== undefined;
      return condition.value === true ? hasTeam : !hasTeam;
    }
    case "subscribed_within": {
      if (condition.amount <= 0) {
        return false;
      }
      const subscribedAt = subscriber.newsletterSubscribedAt;
      if (subscribedAt === undefined) {
        return false;
      }
      return subscribedAt >= now - durationMs(condition.amount, condition.unit);
    }
    case "email_campaign": {
      if (!subscriber._id) {
        return false;
      }
      return subscriberMatchesCampaignEngagement(
        subscriber._id,
        condition,
        engagement,
      );
    }
    case "email_activity":
      return subscriberMatchesEmailActivity(subscriber, condition);
    default:
      return false;
  }
}

/**
 * OR of groups, AND within each group.
 * Empty rule list = everyone (no preference filter).
 * A group with zero conditions never matches (invalid UI state).
 */
export function subscriberMatchesRuleGroups(
  subscriber: AudienceSubscriberSnapshot,
  ruleGroups: AudienceRuleGroup[],
  divisionMetaById: Map<string, DivisionMeta>,
  now: number,
  engagement: AudienceEngagementContext = emptyEngagementContext(),
): boolean {
  if (ruleGroups.length === 0) {
    return true;
  }
  return ruleGroups.some((group) => {
    if (group.conditions.length === 0) {
      return false;
    }
    return group.conditions.every((condition) =>
      evaluateCondition(
        condition,
        subscriber,
        divisionMetaById,
        now,
        engagement,
      ),
    );
  });
}

function joinDutchOr(labels: string[]): string {
  if (labels.length === 0) {
    return "";
  }
  if (labels.length === 1) {
    return labels[0]!;
  }
  if (labels.length === 2) {
    return `${labels[0]} of ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")} of ${labels.at(-1)}`;
}

const ENGAGEMENT_LABELS: Record<"received" | "opened" | "clicked", string> = {
  received: "ontving",
  opened: "opende",
  clicked: "klikte in",
};

function describeCondition(
  condition: AudienceCondition,
  divisionMetaById: Map<string, DivisionMeta>,
  teamMetaById: Map<string, TeamMeta>,
  campaignMetaById: Map<string, CampaignMeta>,
): string | null {
  switch (condition.field) {
    case "division": {
      const labels = condition.divisionIds
        .map((id) => divisionMetaById.get(id)?.label)
        .filter((label): label is string => Boolean(label));
      if (labels.length === 0) {
        return null;
      }
      return `reeks ${joinDutchOr(labels)}`;
    }
    case "province": {
      const labels = condition.provinceKeys
        .map((key) => PROVINCE_LABEL_BY_KEY.get(key) ?? key)
        .filter(Boolean);
      if (labels.length === 0) {
        return null;
      }
      return `provincie ${joinDutchOr(labels)}`;
    }
    case "division_level": {
      const labels = condition.levels
        .map((level) => LEVEL_LABELS[level] ?? `niveau ${level}`)
        .filter(Boolean);
      if (labels.length === 0) {
        return null;
      }
      return joinDutchOr(labels);
    }
    case "favorite_team": {
      const labels = condition.teamIds
        .map((id) => teamMetaById.get(id)?.label)
        .filter((label): label is string => Boolean(label));
      if (labels.length === 0) {
        return null;
      }
      return `favoriete club ${joinDutchOr(labels)}`;
    }
    case "has_favorite_team":
      return condition.value
        ? "heeft een favoriete club"
        : "heeft geen favoriete club";
    case "subscribed_within": {
      const amount = condition.amount;
      const unit = condition.unit;
      const unitLabel =
        unit === "days"
          ? amount === 1
            ? "dag"
            : "dagen"
          : unit === "weeks"
            ? amount === 1
              ? "week"
              : "weken"
            : amount === 1
              ? "maand"
              : "maanden";
      return `ingeschreven in de laatste ${amount} ${unitLabel}`;
    }
    case "email_campaign": {
      const labels = condition.campaignIds
        .map((id) => campaignMetaById.get(id)?.label)
        .filter((label): label is string => Boolean(label));
      if (labels.length === 0) {
        return null;
      }
      return `${ENGAGEMENT_LABELS[condition.operator]} ${joinDutchOr(labels)}`;
    }
    case "email_activity": {
      const verb = ENGAGEMENT_LABELS[condition.operator];
      const when = condition.relative === "after" ? "na" : "vóór";
      const dateLabel = new Date(condition.at).toLocaleDateString("nl-BE");
      return `${verb} een mail ${when} ${dateLabel}`;
    }
    default:
      return null;
  }
}

function describeGroup(
  group: AudienceRuleGroup,
  divisionMetaById: Map<string, DivisionMeta>,
  teamMetaById: Map<string, TeamMeta>,
  campaignMetaById: Map<string, CampaignMeta>,
): string | null {
  const parts = group.conditions
    .map((condition) =>
      describeCondition(
        condition,
        divisionMetaById,
        teamMetaById,
        campaignMetaById,
      ),
    )
    .filter((part): part is string => Boolean(part));
  if (parts.length === 0) {
    return null;
  }
  return parts.join(" én ");
}

export function describeAudienceRules(args: {
  ruleGroups: AudienceRuleGroup[];
  divisions: DivisionMeta[];
  teams: TeamMeta[];
  campaigns?: CampaignMeta[];
}): string {
  const divisionMetaById = new Map(
    args.divisions.map((division) => [division._id as string, division]),
  );
  const teamMetaById = new Map(
    args.teams.map((team) => [team._id as string, team]),
  );
  const campaignMetaById = new Map(
    (args.campaigns ?? []).map((campaign) => [
      campaign._id as string,
      campaign,
    ]),
  );
  if (args.ruleGroups.length === 0) {
    return "Alle actieve abonnees";
  }
  const groupTexts = args.ruleGroups
    .map((group) =>
      describeGroup(group, divisionMetaById, teamMetaById, campaignMetaById),
    )
    .filter((text): text is string => Boolean(text));
  if (groupTexts.length === 0) {
    return "Alle actieve abonnees";
  }
  if (groupTexts.length === 1) {
    return `Actieve abonnees die ${groupTexts[0]}`;
  }
  return `Actieve abonnees die (${groupTexts.join(") of (")})`;
}

/** Validate rule groups before persistence. */
export function validateRuleGroups(ruleGroups: AudienceRuleGroup[]): void {
  if (ruleGroups.length > 20) {
    throw new Error("Maximaal 20 OF-groepen toegestaan.");
  }
  for (const group of ruleGroups) {
    if (group.conditions.length === 0) {
      throw new Error("Elke groep moet minstens één voorwaarde hebben.");
    }
    if (group.conditions.length > 20) {
      throw new Error("Maximaal 20 voorwaarden per groep.");
    }
    for (const condition of group.conditions) {
      switch (condition.field) {
        case "division":
          if (condition.divisionIds.length === 0) {
            throw new Error("Selecteer minstens één reeks.");
          }
          break;
        case "province":
          if (condition.provinceKeys.length === 0) {
            throw new Error("Selecteer minstens één provincie.");
          }
          for (const key of condition.provinceKeys) {
            if (!PROVINCE_LABEL_BY_KEY.has(key)) {
              throw new Error(`Onbekende provincie: ${key}`);
            }
          }
          break;
        case "division_level":
          if (condition.levels.length === 0) {
            throw new Error("Selecteer minstens één niveau.");
          }
          for (const level of condition.levels) {
            if (![1, 2, 3].includes(level)) {
              throw new Error(`Ongeldig niveau: ${level}`);
            }
          }
          break;
        case "favorite_team":
          if (condition.teamIds.length === 0) {
            throw new Error("Selecteer minstens één club.");
          }
          break;
        case "has_favorite_team":
          break;
        case "subscribed_within":
          if (condition.amount < 1 || condition.amount > 120) {
            throw new Error("Periode moet tussen 1 en 120 liggen.");
          }
          break;
        case "email_campaign":
          if (condition.campaignIds.length === 0) {
            throw new Error("Selecteer minstens één nieuwsbrief.");
          }
          break;
        case "email_activity":
          if (!Number.isFinite(condition.at) || condition.at <= 0) {
            throw new Error("Kies een geldige datum.");
          }
          break;
        default:
          throw new Error("Onbekende filter.");
      }
    }
  }
}

export function createDefaultCondition(
  field: AudienceCondition["field"],
): AudienceCondition {
  const id = newRuleId("cond");
  switch (field) {
    case "division":
      return { id, field, operator: "any_of", divisionIds: [] };
    case "province":
      return { id, field, operator: "any_of", provinceKeys: [] };
    case "division_level":
      return { id, field, operator: "any_of", levels: [] };
    case "favorite_team":
      return { id, field, operator: "any_of", teamIds: [] };
    case "has_favorite_team":
      return { id, field, operator: "eq", value: true };
    case "subscribed_within":
      return {
        id,
        field,
        operator: "in_the_last",
        amount: 30,
        unit: "days",
      };
    case "email_campaign":
      return {
        id,
        field,
        operator: "opened",
        campaignIds: [],
      };
    case "email_activity": {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return {
        id,
        field,
        operator: "opened",
        relative: "after",
        at: thirtyDaysAgo,
      };
    }
  }
}

export function createEmptyGroup(): AudienceRuleGroup {
  return {
    id: newRuleId("group"),
    conditions: [createDefaultCondition("province")],
  };
}

export const AUDIENCE_FIELD_OPTIONS = [
  {
    field: "province" as const,
    label: "Provincie",
    help: "Abonnee volgt minstens één reeks in de gekozen provincie(s).",
  },
  {
    field: "division" as const,
    label: "Reeks",
    help: "Zoek en selecteer reeksen. Abonnee volgt minstens één ervan.",
  },
  {
    field: "division_level" as const,
    label: "Niveau",
    help: "Abonnee volgt minstens één reeks van het gekozen niveau (1ste/2de/3de).",
  },
  {
    field: "favorite_team" as const,
    label: "Favoriete club",
    help: "Zoek en selecteer clubs. Favoriete club is één van de gekozen.",
  },
  {
    field: "has_favorite_team" as const,
    label: "Heeft favoriete club",
    help: "Filter op wel of geen favoriete club gekozen.",
  },
  {
    field: "subscribed_within" as const,
    label: "Ingeschreven sinds",
    help: "Alleen abonnees die recent (opnieuw) inschreven voor de nieuwsbrief.",
  },
  {
    field: "email_campaign" as const,
    label: "Mailgedrag (campagne)",
    help: "Ontving, opende of klikte in één van de gekozen verzonden nieuwsbrieven.",
  },
  {
    field: "email_activity" as const,
    label: "Mailgedrag (periode)",
    help: "Ontving, opende of klikte in eender welke mail vóór of na een datum.",
  },
] as const;
