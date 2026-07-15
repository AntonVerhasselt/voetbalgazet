import { customMutation, customQuery } from "convex-helpers/server/customFunctions";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";
import type { AdminRole } from "./adminRoles";

type AdminContext = QueryCtx | MutationCtx;

async function requireAdminUser(
  ctx: AdminContext,
  allowedRoles: readonly AdminRole[],
): Promise<Doc<"users">> {
  const authUser = await authComponent.getAuthUser(ctx);
  const adminUser = await ctx.db
    .query("users")
    .withIndex("by_auth_user", (indexQuery) =>
      indexQuery.eq("authUserId", authUser._id),
    )
    .unique();

  if (!adminUser) {
    throw new Error("Geen toegang tot de redactieomgeving.");
  }
  if (adminUser.disabledAt !== undefined) {
    throw new Error("Deze redactieaccount is uitgeschakeld.");
  }
  if (!allowedRoles.includes(adminUser.role)) {
    throw new Error("Je rol heeft onvoldoende rechten voor deze actie.");
  }

  return adminUser;
}

export const viewerQuery = customQuery(query, {
  args: {},
  input: async (ctx) => ({
    ctx: {
      adminUser: await requireAdminUser(ctx, [
        "admin",
        "journalist",
        "viewer",
      ]),
    },
    args: {},
  }),
});

export const editorQuery = customQuery(query, {
  args: {},
  input: async (ctx) => ({
    ctx: {
      adminUser: await requireAdminUser(ctx, ["admin", "journalist"]),
    },
    args: {},
  }),
});

export const adminQuery = customQuery(query, {
  args: {},
  input: async (ctx) => ({
    ctx: {
      adminUser: await requireAdminUser(ctx, ["admin"]),
    },
    args: {},
  }),
});

export const editorMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => ({
    ctx: {
      adminUser: await requireAdminUser(ctx, ["admin", "journalist"]),
    },
    args: {},
  }),
});

export const adminMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => ({
    ctx: {
      adminUser: await requireAdminUser(ctx, ["admin"]),
    },
    args: {},
  }),
});
