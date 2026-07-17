import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  type EmailLinkPurpose,
  generateOpaqueToken,
  hashToken,
} from "./emailLinkToken";

export type MintEmailLinkTokenArgs = {
  purpose: EmailLinkPurpose;
  subscriberId: Id<"subscribers">;
  expiresAt: number;
  articleSlug?: string;
  sendId?: Id<"newsletterSends">;
  campaignId?: Id<"newsletterCampaigns">;
};

export async function mintEmailLinkToken(
  ctx: MutationCtx,
  args: MintEmailLinkTokenArgs,
): Promise<string> {
  const token = generateOpaqueToken();
  await ctx.db.insert("emailLinkTokens", {
    tokenHash: await hashToken(token),
    purpose: args.purpose,
    subscriberId: args.subscriberId,
    expiresAt: args.expiresAt,
    createdAt: Date.now(),
    articleSlug: args.articleSlug,
    sendId: args.sendId,
    campaignId: args.campaignId,
  });
  return token;
}

export async function lookupEmailLinkToken(
  ctx: QueryCtx | MutationCtx,
  rawToken: string,
  purpose: EmailLinkPurpose,
): Promise<Doc<"emailLinkTokens"> | null> {
  const tokenHash = await hashToken(rawToken);
  const tokenRecord = await ctx.db
    .query("emailLinkTokens")
    .withIndex("by_token_hash", (query) => query.eq("tokenHash", tokenHash))
    .unique();
  if (!tokenRecord || tokenRecord.purpose !== purpose) {
    return null;
  }
  return tokenRecord;
}
