import { ConvexHttpClient } from "convex/browser";
import { hashRateLimitValue } from "../../../../convex/lib/rateLimit";

type RateBucket = {
  hits: number[];
};

const buckets = new Map<string, RateBucket>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_HITS = 30;

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

export function hashClientIp(ip: string): string {
  return hashRateLimitValue(`ip:${ip}`);
}

export function checkSignupIpRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ipHash) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((at) => now - at < WINDOW_MS);
  if (bucket.hits.length >= MAX_HITS) {
    buckets.set(ipHash, bucket);
    return false;
  }
  bucket.hits.push(now);
  buckets.set(ipHash, bucket);
  return true;
}

export function getConvexHttpClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Inschrijven is nog niet geconfigureerd.");
  }
  return new ConvexHttpClient(convexUrl);
}
