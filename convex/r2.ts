import { R2 } from "@convex-dev/r2";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { authComponent } from "./auth";
import { mediaCdnUrl } from "./lib/compliance";

export const r2 = new R2(components.r2);

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 5 * 1024 * 1024;

async function requireEditorUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users">> {
  const authUser = await authComponent.getAuthUser(ctx);
  const adminUser = await ctx.db
    .query("users")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUser._id))
    .unique();
  if (!adminUser || adminUser.disabledAt !== undefined) {
    throw new Error("Geen toegang tot media-uploads.");
  }
  if (adminUser.role !== "admin" && adminUser.role !== "journalist") {
    throw new Error("Je rol mag geen beelden uploaden.");
  }
  return adminUser._id;
}

export const {
  generateUploadUrl,
  syncMetadata,
  getMetadata,
  listMetadata,
  deleteObject,
} = r2.clientApi<DataModel>({
  checkUpload: async (ctx) => {
    await requireEditorUser(ctx);
  },
  checkReadBucket: async (ctx) => {
    await requireEditorUser(ctx);
  },
  checkReadKey: async (ctx) => {
    await requireEditorUser(ctx);
  },
  checkDelete: async (ctx) => {
    await requireEditorUser(ctx);
  },
  onSyncMetadata: async (ctx, args) => {
    const uploadedBy = await requireEditorUser(ctx);
    const existing = await ctx.db
      .query("emailMedia")
      .withIndex("by_r2Key", (q) => q.eq("r2Key", args.key))
      .unique();
    const metadata = await r2.getMetadata(ctx, args.key);
    const mimeType = metadata?.contentType ?? "application/octet-stream";
    const size = metadata?.size ?? 0;
    if (!ALLOWED_MIME.has(mimeType) || size > MAX_BYTES) {
      if (existing) {
        await ctx.db.patch(existing._id, { status: "rejected" });
      }
      return;
    }
    const publicUrl = mediaCdnUrl(args.key);
    if (existing) {
      await ctx.db.patch(existing._id, {
        publicUrl,
        mimeType,
        size,
        status: "ready",
      });
      return;
    }
    await ctx.db.insert("emailMedia", {
      r2Key: args.key,
      publicUrl,
      mimeType,
      size,
      uploadedBy,
      createdAt: Date.now(),
      status: "ready",
      usedBySentEmail: false,
    });
  },
});

export const resolvePublicUrl = mutation({
  args: { r2Key: v.string() },
  returns: v.object({ publicUrl: v.string() }),
  handler: async (ctx, args) => {
    await requireEditorUser(ctx);
    const media = await ctx.db
      .query("emailMedia")
      .withIndex("by_r2Key", (q) => q.eq("r2Key", args.r2Key))
      .unique();
    if (!media || media.status !== "ready") {
      throw new Error("Beeld is nog niet beschikbaar.");
    }
    return { publicUrl: media.publicUrl };
  },
});
