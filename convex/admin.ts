import { v } from "convex/values";
import { authComponent, createAuth } from "./auth";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { viewerQuery } from "./lib/adminAuth";
import { parseBootstrapRoleMap } from "./lib/adminRoles";
import { adminRoleValidator } from "./lib/validators";

const adminSessionValidator = v.object({
  email: v.string(),
  role: adminRoleValidator,
});

async function requireGithubAccount(
  ctx: MutationCtx,
): Promise<void> {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const accounts = await auth.api.listUserAccounts({ headers });
  if (!accounts.some((account) => account.providerId === "github")) {
    throw new Error("Meld je voor de redactieomgeving aan via GitHub.");
  }
}

export const claimConfiguredMembership = mutation({
  args: {},
  returns: adminSessionValidator,
  handler: async (ctx) => {
    await requireGithubAccount(ctx);
    const authUser = await authComponent.getAuthUser(ctx);
    const normalizedEmail = authUser.email.trim().toLowerCase();
    const existingMembership = await ctx.db
      .query("users")
      .withIndex("by_auth_user", (indexQuery) =>
        indexQuery.eq("authUserId", authUser._id),
      )
      .unique();

    if (existingMembership) {
      if (existingMembership.disabledAt !== undefined) {
        throw new Error("Deze redactieaccount is uitgeschakeld.");
      }
      return {
        email: existingMembership.email,
        role: existingMembership.role,
      };
    }

    if (!authUser.emailVerified) {
      throw new Error("Gebruik een GitHub-account met een bevestigd e-mailadres.");
    }

    const roleMap = parseBootstrapRoleMap(
      process.env.ADMIN_BOOTSTRAP_ROLE_MAP,
    );
    const configuredRole = roleMap.get(normalizedEmail);
    if (!configuredRole) {
      throw new Error("Geen toegang tot de redactieomgeving.");
    }

    const membershipForEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (indexQuery) =>
        indexQuery.eq("email", normalizedEmail),
      )
      .unique();
    if (membershipForEmail) {
      throw new Error("Dit redactieprofiel is al aan een andere login gekoppeld.");
    }

    await ctx.db.insert("users", {
      authUserId: authUser._id,
      email: normalizedEmail,
      role: configuredRole,
    });

    return {
      email: normalizedEmail,
      role: configuredRole,
    };
  },
});

export const getSession = viewerQuery({
  args: {},
  returns: adminSessionValidator,
  handler: async (ctx) => ({
    email: ctx.adminUser.email,
    role: ctx.adminUser.role,
  }),
});
