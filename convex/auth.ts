import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { AGENT_EMAIL } from "./lib/agentAccessShared";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

/** Accept apex + www during host migration; canonical SITE_URL stays apex. */
function trustedOriginsFor(site: string): string[] {
  try {
    const url = new URL(site);
    const hosts = new Set<string>([url.origin]);
    if (url.hostname.startsWith("www.")) {
      hosts.add(`${url.protocol}//${url.hostname.slice(4)}`);
    } else if (url.hostname.includes(".")) {
      hosts.add(`${url.protocol}//www.${url.hostname}`);
    }
    return [...hosts];
  } catch {
    return [site];
  }
}

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuthOptions(ctx: GenericCtx<DataModel>): BetterAuthOptions {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

  return {
    appName: "De Voetbalgazet Admin",
    baseURL: siteUrl,
    trustedOrigins: trustedOriginsFor(siteUrl),
    database: authComponent.adapter(ctx),
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    // Email/password is an internal agent mechanism only — no UI on
    // /admin/inloggen. Public sign-up stays disabled; the agent user is
    // provisioned via convex/agentAccess.ts.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: false,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (user.email.trim().toLowerCase() === AGENT_EMAIL) {
              return {
                data: {
                  ...user,
                  emailVerified: true,
                },
              };
            }
            return { data: user };
          },
        },
      },
    },
    ...(betterAuthSecret ? { secret: betterAuthSecret } : {}),
    ...(githubClientId && githubClientSecret
      ? {
          socialProviders: {
            github: {
              clientId: githubClientId,
              clientSecret: githubClientSecret,
            },
          },
        }
      : {}),
    plugins: [convex({ authConfig })],
  };
}

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
