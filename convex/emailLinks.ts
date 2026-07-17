import { v } from "convex/values";
import { createAuth } from "./auth";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { lookupEmailLinkToken } from "./lib/emailLinkTokensDb";

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAGIC_LINK_TTL_MS = 5 * 60 * 1000;
const MAGIC_LINK_CHARSET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return "***";
  }
  return `${local.slice(0, 1)}***@${domain}`;
}

function randomMagicLinkToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let token = "";
  for (const byte of bytes) {
    token += MAGIC_LINK_CHARSET[byte % MAGIC_LINK_CHARSET.length]!;
  }
  return token;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function hashBetterAuthMagicLinkToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return base64UrlEncode(new Uint8Array(digest));
}

async function ensureBetterAuthVerifiedUser(
  ctx: Parameters<typeof createAuth>[0],
  email: string,
): Promise<void> {
  const auth = createAuth(ctx);
  const authContext = await auth.$context;
  const existing = await authContext.internalAdapter.findUserByEmail(email);
  if (!existing) {
    await authContext.internalAdapter.createUser({
      email,
      name: "",
      emailVerified: true,
    });
    return;
  }
  if (!existing.user.emailVerified) {
    await authContext.internalAdapter.updateUser(existing.user.id, {
      emailVerified: true,
    });
  }
}

async function createBetterAuthMagicLinkVerification(
  ctx: Parameters<typeof createAuth>[0],
  email: string,
  now: number,
): Promise<string> {
  const magicLinkToken = randomMagicLinkToken();
  const auth = createAuth(ctx);
  const authContext = await auth.$context;
  await authContext.internalAdapter.createVerificationValue({
    identifier: await hashBetterAuthMagicLinkToken(magicLinkToken),
    value: JSON.stringify({ email, name: "" }),
    expiresAt: new Date(now + MAGIC_LINK_TTL_MS),
  });
  return magicLinkToken;
}

function assertUsableToken(
  tokenRecord: Doc<"emailLinkTokens"> | null,
  now: number,
): Doc<"emailLinkTokens"> {
  if (!tokenRecord || tokenRecord.expiresAt < now) {
    throw new Error("Ongeldige of verlopen e-maillink.");
  }
  return tokenRecord;
}

export const resolveUnsubscribeToken = query({
  args: {
    token: v.string(),
    now: v.number(),
  },
  returns: v.object({
    valid: v.boolean(),
    maskedEmail: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const tokenRecord = await lookupEmailLinkToken(
      ctx,
      args.token,
      "newsletter_unsubscribe",
    );
    if (!tokenRecord || tokenRecord.expiresAt < args.now) {
      return { valid: false };
    }
    const subscriber = await ctx.db.get(
      "subscribers",
      tokenRecord.subscriberId,
    );
    if (!subscriber) {
      return { valid: false };
    }
    return {
      valid: true,
      maskedEmail: maskEmail(subscriber.normalizedEmail),
    };
  },
});

export const exchangeBootstrapToken = mutation({
  args: {
    token: v.string(),
    purpose: v.union(v.literal("article_access"), v.literal("preferences_access")),
    articleSlug: v.optional(v.string()),
  },
  returns: v.object({
    magicLinkToken: v.string(),
    callbackPath: v.string(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const tokenRecord = assertUsableToken(
      await lookupEmailLinkToken(ctx, args.token, args.purpose),
      now,
    );
    const subscriber = await ctx.db.get(
      "subscribers",
      tokenRecord.subscriberId,
    );
    if (!subscriber) {
      throw new Error("Geen abonnee gevonden voor deze e-maillink.");
    }

    let callbackPath = "/voorkeuren";
    if (args.purpose === "article_access") {
      if (!subscriber.siteAccess) {
        throw new Error("Geen actieve lezerstoegang gevonden.");
      }
      if (!args.articleSlug || !SAFE_SLUG.test(args.articleSlug)) {
        throw new Error("Ongeldige artikellink.");
      }
      if (
        tokenRecord.articleSlug !== undefined &&
        tokenRecord.articleSlug !== args.articleSlug
      ) {
        throw new Error("Deze artikellink hoort bij een ander artikel.");
      }
      callbackPath = `/nieuws/${args.articleSlug}`;
    }

    await ensureBetterAuthVerifiedUser(ctx, subscriber.normalizedEmail);
    if (!subscriber.emailVerifiedAt) {
      await ctx.db.patch("subscribers", subscriber._id, {
        emailVerifiedAt: now,
      });
    }

    return {
      magicLinkToken: await createBetterAuthMagicLinkVerification(
        ctx,
        subscriber.normalizedEmail,
        now,
      ),
      callbackPath,
    };
  },
});
