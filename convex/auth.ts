import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { anonymous, magicLink } from "better-auth/plugins";
import { components } from "./_generated/api";
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

async function sendMagicLinkEmail(data: {
  email: string;
  url: string;
}): Promise<void> {
  const adminRoles = parseBootstrapRoleMap(
    process.env.ADMIN_BOOTSTRAP_ROLE_MAP,
  );
  if (adminRoles.has(data.email.normalize("NFKC").trim().toLowerCase())) {
    throw new Error("Gebruik GitHub voor de redactieomgeving.");
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    if (isSecureSite) {
      throw new Error("RESEND_API_KEY ontbreekt voor de verificatiemail.");
    }
    return;
  }

  const from =
    process.env.EMAIL_FROM ??
    "De Voetbalgazet <redactie@devoetbalgazet.be>";
  const safeUrl = data.url.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [data.email],
      subject: "Welkom bij De Voetbalgazet",
      html:
        "<h1>Welkom bij De Voetbalgazet</h1>" +
        "<p>Je kunt meteen verder lezen. Bevestig je e-mailadres om later je voorkeuren veilig aan te passen.</p>" +
        `<p><a href="${safeUrl}">Bevestig mijn e-mailadres</a></p>` +
        "<p>Deze link vervalt na 15 minuten.</p>",
      text:
        "Welkom bij De Voetbalgazet.\n\n" +
        "Bevestig je e-mailadres om later je voorkeuren veilig aan te passen:\n" +
        `${data.url}\n\nDeze link vervalt na 15 minuten.`,
    }),
  });
  if (!response.ok) {
    throw new Error("De verificatiemail kon niet worden verstuurd.");
  }
}

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
      }),
      magicLink({
        expiresIn: 60 * 15,
        storeToken: "hashed",
        rateLimit: {
          window: 60,
          max: 5,
        },
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail({ email, url });
        },
      }),
    ],
  };
}

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
