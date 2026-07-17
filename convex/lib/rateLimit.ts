import type { MutationCtx } from "../_generated/server";

const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_MAX_ATTEMPTS = 12;
const SIGNUP_IP_MAX_ATTEMPTS = 40;

export function hashRateLimitValue(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function consumeRateLimitBucket(
  ctx: MutationCtx,
  key: string,
  now: number,
  maxAttempts: number,
  errorMessage: string,
): Promise<void> {
  const keyHash = hashRateLimitValue(key);
  const bucket = await ctx.db
    .query("signupRateLimits")
    .withIndex("by_key_hash", (query) => query.eq("keyHash", keyHash))
    .unique();

  if (!bucket || now - bucket.windowStartedAt >= SIGNUP_WINDOW_MS) {
    if (bucket) {
      await ctx.db.patch("signupRateLimits", bucket._id, {
        count: 1,
        windowStartedAt: now,
      });
    } else {
      await ctx.db.insert("signupRateLimits", {
        keyHash,
        count: 1,
        windowStartedAt: now,
      });
    }
    return;
  }

  if (bucket.count >= maxAttempts) {
    throw new Error(errorMessage);
  }
  await ctx.db.patch("signupRateLimits", bucket._id, {
    count: bucket.count + 1,
  });
}

export async function consumeSignupRateLimit(
  ctx: MutationCtx,
  normalizedEmail: string,
  now: number,
  clientIpHash?: string,
): Promise<void> {
  await consumeRateLimitBucket(
    ctx,
    `email:${normalizedEmail}`,
    now,
    SIGNUP_MAX_ATTEMPTS,
    "Te veel inschrijfpogingen. Wacht even en probeer later opnieuw.",
  );
  if (clientIpHash) {
    await consumeRateLimitBucket(
      ctx,
      `ip:${clientIpHash}`,
      now,
      SIGNUP_IP_MAX_ATTEMPTS,
      "Te veel inschrijfpogingen vanaf dit netwerk. Wacht even en probeer later opnieuw.",
    );
  }
}
