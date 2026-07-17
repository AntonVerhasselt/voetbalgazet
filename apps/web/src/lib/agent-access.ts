import {
  AGENT_ACCESS_SECRET_MIN_LENGTH,
  AGENT_EMAIL,
  deriveAgentPassword,
  hashIpAddress,
  readConfiguredAgentAccessSecret,
  secretsEqual,
} from "../../../../convex/lib/agentAccessShared";

export {
  AGENT_ACCESS_SECRET_MIN_LENGTH,
  AGENT_EMAIL,
  deriveAgentPassword,
  hashIpAddress,
  secretsEqual,
};

export function getAgentAccessSecret(): string | null {
  return readConfiguredAgentAccessSecret(process.env.AGENT_ACCESS_SECRET);
}

export function isAgentAccessEnabled(): boolean {
  return getAgentAccessSecret() !== null;
}

export function verifyAgentAccessSecret(candidate: string): boolean {
  const expected = getAgentAccessSecret();
  if (!expected) {
    return false;
  }
  return secretsEqual(candidate, expected);
}

/** In-memory rate limits for this Next.js process (MVP). */
type RateBucket = {
  failures: number[];
  successes: number[];
};

const rateBuckets = new Map<string, RateBucket>();

const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const FAILURE_LIMIT = 10;
const SUCCESS_WINDOW_MS = 60 * 60 * 1000;
const SUCCESS_LIMIT = 30;

function getBucket(ipHash: string): RateBucket {
  const existing = rateBuckets.get(ipHash);
  if (existing) {
    return existing;
  }
  const created: RateBucket = { failures: [], successes: [] };
  rateBuckets.set(ipHash, created);
  return created;
}

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((at) => now - at < windowMs);
}

export function checkAgentAccessRateLimit(ipHash: string): {
  allowed: boolean;
  reason?: "failures" | "successes";
} {
  const now = Date.now();
  const bucket = getBucket(ipHash);
  bucket.failures = prune(bucket.failures, FAILURE_WINDOW_MS, now);
  bucket.successes = prune(bucket.successes, SUCCESS_WINDOW_MS, now);

  if (bucket.failures.length >= FAILURE_LIMIT) {
    return { allowed: false, reason: "failures" };
  }
  if (bucket.successes.length >= SUCCESS_LIMIT) {
    return { allowed: false, reason: "successes" };
  }
  return { allowed: true };
}

export function recordAgentAccessFailure(ipHash: string): void {
  const bucket = getBucket(ipHash);
  bucket.failures.push(Date.now());
}

export function recordAgentAccessSuccess(ipHash: string): void {
  const bucket = getBucket(ipHash);
  bucket.successes.push(Date.now());
}

/** Test helper — clears in-memory rate limit state. */
export function resetAgentAccessRateLimitsForTests(): void {
  rateBuckets.clear();
}
