import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Ensure a single lock row per divisionKey, then acquire it via OCC patch.
 * Concurrent acquires on the same document serialize: loser retries and sees busy.
 */
export async function acquireDivisionResearchLock(
  ctx: MutationCtx,
  divisionKey: string,
): Promise<Id<"pipelineDivisionLocks">> {
  const lock = await ensureDivisionLockRow(ctx, divisionKey);
  if (lock.busy) {
    throw new Error(
      "Er loopt al research voor deze reeks. Wacht tot die klaar is.",
    );
  }
  await ctx.db.patch(lock._id, {
    busy: true,
    updatedAt: Date.now(),
  });
  return lock._id;
}

export async function bindDivisionResearchLock(
  ctx: MutationCtx,
  lockId: Id<"pipelineDivisionLocks">,
  runId: Id<"pipelineResearchRuns">,
): Promise<void> {
  await ctx.db.patch(lockId, {
    runId,
    updatedAt: Date.now(),
  });
}

export async function releaseDivisionResearchLock(
  ctx: MutationCtx,
  divisionKey: string,
  runId?: Id<"pipelineResearchRuns">,
): Promise<void> {
  const lock = await ctx.db
    .query("pipelineDivisionLocks")
    .withIndex("by_division", (q) => q.eq("divisionKey", divisionKey))
    .unique();
  if (!lock) return;
  if (runId && lock.runId && lock.runId !== runId) {
    return;
  }
  await ctx.db.patch(lock._id, {
    busy: false,
    runId: undefined,
    updatedAt: Date.now(),
  });
}

async function ensureDivisionLockRow(
  ctx: MutationCtx,
  divisionKey: string,
) {
  const existing = await ctx.db
    .query("pipelineDivisionLocks")
    .withIndex("by_division", (q) => q.eq("divisionKey", divisionKey))
    .collect();

  if (existing.length === 0) {
    const id = await ctx.db.insert("pipelineDivisionLocks", {
      divisionKey,
      busy: false,
      updatedAt: Date.now(),
    });
    // Another concurrent insert may have raced — keep the oldest row.
    const rows = await ctx.db
      .query("pipelineDivisionLocks")
      .withIndex("by_division", (q) => q.eq("divisionKey", divisionKey))
      .collect();
    if (rows.length === 1) {
      return rows[0]!;
    }
    rows.sort((a, b) => a._creationTime - b._creationTime);
    const keep = rows[0]!;
    for (const row of rows.slice(1)) {
      await ctx.db.delete(row._id);
    }
    // Prefer the row we just inserted only if it is the oldest; otherwise
    // re-read keep (may already be busy from the winner).
    void id;
    return keep;
  }

  if (existing.length === 1) {
    return existing[0]!;
  }

  existing.sort((a, b) => a._creationTime - b._creationTime);
  const keep = existing[0]!;
  for (const row of existing.slice(1)) {
    await ctx.db.delete(row._id);
  }
  return keep;
}

export async function isDivisionResearchBusy(
  ctx: QueryCtx | MutationCtx,
  divisionKey: string,
): Promise<boolean> {
  const lock = await ctx.db
    .query("pipelineDivisionLocks")
    .withIndex("by_division", (q) => q.eq("divisionKey", divisionKey))
    .unique();
  return lock?.busy === true;
}
