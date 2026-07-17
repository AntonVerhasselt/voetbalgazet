import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const MARKETING_KILL_SWITCH_KEY = "marketing_kill_switch";

export const marketingKillSwitchValueValidator = v.union(
  v.literal("on"),
  v.literal("off"),
);

export type MarketingKillSwitchValue = "on" | "off";

export async function readMarketingKillSwitch(
  ctx: QueryCtx | MutationCtx,
): Promise<MarketingKillSwitchValue> {
  const setting = await ctx.db
    .query("appRuntimeSettings")
    .withIndex("by_key", (q) => q.eq("key", MARKETING_KILL_SWITCH_KEY))
    .unique();
  return setting?.value === "on" ? "on" : "off";
}

export async function assertMarketingSendEnabled(
  ctx: QueryCtx | MutationCtx,
): Promise<void> {
  if ((await readMarketingKillSwitch(ctx)) === "on") {
    throw new Error("Marketingverzendingen zijn tijdelijk uitgeschakeld.");
  }
}
