import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function hasActiveSuppression(
  ctx: Ctx,
  args: {
    subscriberId?: Id<"subscribers">;
    normalizedEmail: string;
    types?: Doc<"emailSuppressions">["type"][];
  },
): Promise<boolean> {
  const types = args.types ?? [
    "unsubscribe",
    "hard_bounce",
    "complaint",
    "manual",
  ];
  for (const type of types) {
    const rows = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_email_and_type", (q) =>
        q.eq("normalizedEmail", args.normalizedEmail).eq("type", type),
      )
      .collect();
    if (rows.some((row) => row.clearedAt === undefined)) {
      return true;
    }
  }
  return false;
}

export async function addSuppression(
  ctx: MutationCtx,
  args: {
    subscriberId?: Id<"subscribers">;
    normalizedEmail: string;
    type: Doc<"emailSuppressions">["type"];
    sourceId?: string;
    now?: number;
  },
): Promise<void> {
  const now = args.now ?? Date.now();
  const existing = await ctx.db
    .query("emailSuppressions")
    .withIndex("by_email_and_type", (q) =>
      q.eq("normalizedEmail", args.normalizedEmail).eq("type", args.type),
    )
    .collect();
  const active = existing.find((row) => row.clearedAt === undefined);
  if (active) {
    return;
  }
  await ctx.db.insert("emailSuppressions", {
    subscriberId: args.subscriberId,
    normalizedEmail: args.normalizedEmail,
    type: args.type,
    sourceId: args.sourceId,
    createdAt: now,
  });
}

export async function clearUnsubscribeSuppression(
  ctx: MutationCtx,
  args: {
    subscriberId: Id<"subscribers">;
    normalizedEmail: string;
    clearedBy?: Id<"users">;
    now?: number;
  },
): Promise<void> {
  const now = args.now ?? Date.now();
  const rows = await ctx.db
    .query("emailSuppressions")
    .withIndex("by_email_and_type", (q) =>
      q.eq("normalizedEmail", args.normalizedEmail).eq("type", "unsubscribe"),
    )
    .collect();
  for (const row of rows) {
    if (row.clearedAt === undefined) {
      await ctx.db.patch(row._id, {
        clearedAt: now,
        clearedBy: args.clearedBy,
      });
    }
  }
}
