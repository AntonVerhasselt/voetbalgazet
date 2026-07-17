import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { anonymous, magicLink } from "better-auth/plugins";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { AGENT_EMAIL } from "./lib/agentAccessShared";
import { parseBootstrapRoleMap } from "./lib/adminRoles";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
const isSecureSite = siteUrl.startsWith("https://");

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
    appName: "De Voetbalgazet",
    baseURL: siteUrl,
    trustedOrigins: trustedOriginsFor(siteUrl),
    database: authComponent.adapter(ctx),
    session: {
      expiresIn: 60 * 60 * 24 * 90,
      updateAge: 60 * 60 * 24 * 7,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
        strategy: "compact",
      },
    },
    advanced: {
      useSecureCookies: isSecureSite,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: isSecureSite,
        sameSite: "lax",
        path: "/",
      },
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
    plugins: [
      convex({
        authConfig,
        jwt: {
          expirationSeconds: 60 * 60,
          definePayload: ({ user }) => ({
            readerAccess:
              user.isAnonymous === true || user.emailVerified === true,
          }),
        },
      }),
      anonymous({
        emailDomainName: "reader.devoetbalgazet.be",
        onLinkAccount: async ({ newUser }) => {
          const email = newUser.user.email?.trim();
          if (!email || newUser.user.isAnonymous) {
            return;
          }
          if (!("runMutation" in ctx)) {
            return;
          }
          try {
            await ctx.runMutation(
              internal.subscribers.markEmailVerifiedFromAuth,
              { email },
            );
          } catch (error) {
            console.error("Failed to sync emailVerifiedAt on link", error);
          }
        },
      }),
      magicLink({
        expiresIn: 60 * 15,
        storeToken: "hashed",
        rateLimit: {
          window: 60,
          max: 5,
        },
        sendMagicLink: async ({ email, url }) => {
          const adminRoles = parseBootstrapRoleMap(
            process.env.ADMIN_BOOTSTRAP_ROLE_MAP,
          );
          if (adminRoles.has(email.normalize("NFKC").trim().toLowerCase())) {
            throw new Error("Gebruik GitHub voor de redactieomgeving.");
          }
          if (!("runMutation" in ctx)) {
            if (!isSecureSite) {
              return;
            }
            throw new Error(
              "Verificatiemail kon niet worden gepland (geen Convex-context).",
            );
          }
          // Combined welcome + confirm flow uses the `welcome` template
          // (confirmUrl). Plan allows merging Welcome/Verify into one mail.
          await ctx.runMutation(
            internal.newsletterAdmin.sendTransactionalEmail,
            {
              type: "welcome",
              toEmail: email,
              variables: { confirmUrl: url },
            },
          );
        },
      }),
    ],
  };
}

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
