import { v } from "convex/values";
import { authComponent, createAuth } from "./auth";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import {
  AGENT_DISPLAY_NAME,
  AGENT_EMAIL,
  deriveAgentPassword,
  readConfiguredAgentAccessSecret,
  secretsEqual,
} from "./lib/agentAccessShared";

const agentAccessResultValidator = v.union(
  v.literal("success"),
  v.literal("failure"),
  v.literal("disabled"),
);

async function insertEvent(
  ctx: MutationCtx,
  args: {
    result: "success" | "failure" | "disabled";
    ipHash?: string;
    userAgent?: string;
  },
) {
  await ctx.db.insert("agentAccessEvents", {
    at: Date.now(),
    result: args.result,
    ...(args.ipHash ? { ipHash: args.ipHash } : {}),
    ...(args.userAgent ? { userAgent: args.userAgent } : {}),
  });
}

/**
 * Verify the agent secret, ensure the Better Auth credential user exists
 * (and password matches the current secret), and write an audit event on
 * failure/disabled. Called from the Next.js agent-session route before
 * email sign-in.
 */
export const prepareAgentSession = mutation({
  args: {
    secret: v.string(),
    ipHash: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.object({
    email: v.string(),
  }),
  handler: async (ctx, args) => {
    const configured = readConfiguredAgentAccessSecret(
      process.env.AGENT_ACCESS_SECRET,
    );
    if (!configured) {
      await insertEvent(ctx, {
        result: "disabled",
        ipHash: args.ipHash,
        userAgent: args.userAgent,
      });
      throw new Error("Agenttoegang is uitgeschakeld.");
    }

    if (!secretsEqual(args.secret, configured)) {
      await insertEvent(ctx, {
        result: "failure",
        ipHash: args.ipHash,
        userAgent: args.userAgent,
      });
      throw new Error("Ongeldige agenttoegang.");
    }

    const password = await deriveAgentPassword(configured);
    const auth = createAuth(ctx);
    const authContext = await auth.$context;
    const existing = await authContext.internalAdapter.findUserByEmail(
      AGENT_EMAIL,
      { includeAccounts: true },
    );

    if (!existing) {
      const user = await authContext.internalAdapter.createUser({
        email: AGENT_EMAIL,
        name: AGENT_DISPLAY_NAME,
        emailVerified: true,
      });
      const hashedPassword = await authContext.password.hash(password);
      await authContext.internalAdapter.linkAccount({
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: hashedPassword,
      });
    } else {
      if (!existing.user.emailVerified) {
        await authContext.internalAdapter.updateUser(existing.user.id, {
          emailVerified: true,
        });
      }
      const hashedPassword = await authContext.password.hash(password);
      const hasCredential = existing.accounts.some(
        (account) => account.providerId === "credential",
      );
      if (hasCredential) {
        await authContext.internalAdapter.updatePassword(
          existing.user.id,
          hashedPassword,
        );
      } else {
        await authContext.internalAdapter.linkAccount({
          userId: existing.user.id,
          providerId: "credential",
          accountId: existing.user.id,
          password: hashedPassword,
        });
      }
    }

    return { email: AGENT_EMAIL };
  },
});

/**
 * After a Better Auth session exists for the agent email, ensure the app
 * `users` membership row with role admin. Does not use the bootstrap map.
 */
export const ensureAgentMembership = mutation({
  args: {},
  returns: v.object({
    email: v.string(),
    role: v.literal("admin"),
  }),
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const normalizedEmail = authUser.email.trim().toLowerCase();
    if (normalizedEmail !== AGENT_EMAIL) {
      throw new Error("Deze sessie is geen agentaccount.");
    }

    const byAuth = await ctx.db
      .query("users")
      .withIndex("by_auth_user", (indexQuery) =>
        indexQuery.eq("authUserId", authUser._id),
      )
      .unique();

    if (byAuth) {
      if (byAuth.disabledAt !== undefined) {
        throw new Error("Deze redactieaccount is uitgeschakeld.");
      }
      if (byAuth.role !== "admin") {
        await ctx.db.patch(byAuth._id, { role: "admin" });
      }
      return { email: byAuth.email, role: "admin" as const };
    }

    const byEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (indexQuery) =>
        indexQuery.eq("email", AGENT_EMAIL),
      )
      .unique();
    if (byEmail) {
      throw new Error(
        "Dit redactieprofiel is al aan een andere login gekoppeld.",
      );
    }

    await ctx.db.insert("users", {
      authUserId: authUser._id,
      email: AGENT_EMAIL,
      role: "admin",
    });

    return { email: AGENT_EMAIL, role: "admin" as const };
  },
});

export const recordAgentAccessEvent = mutation({
  args: {
    result: agentAccessResultValidator,
    ipHash: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await insertEvent(ctx, args);
    return null;
  },
});
