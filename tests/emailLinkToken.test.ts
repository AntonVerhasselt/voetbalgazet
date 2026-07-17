import { describe, expect, it } from "vitest";
import {
  ARTICLE_ACCESS_TTL_MS,
  PREFERENCES_ACCESS_TTL_MS,
  UNSUBSCRIBE_TTL_MS,
  generateOpaqueToken,
  hashToken,
  ttlForEmailLinkPurpose,
  verifyTokenHash,
} from "../convex/lib/emailLinkToken";

describe("opaque email link tokens", () => {
  it("generates opaque tokens without email payloads", () => {
    const token = generateOpaqueToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{32,128}$/u);
    expect(token).not.toContain("@");
    expect(token).not.toContain("reader");
  });

  it("round-trips token hashes", async () => {
    const token = "opaque-token-for-test";
    const hash = await hashToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(await verifyTokenHash(token, hash)).toBe(true);
    expect(await verifyTokenHash(`${token}x`, hash)).toBe(false);
  });

  it("uses purpose-specific TTLs", () => {
    expect(ttlForEmailLinkPurpose("newsletter_unsubscribe")).toBe(
      UNSUBSCRIBE_TTL_MS,
    );
    expect(ttlForEmailLinkPurpose("article_access")).toBe(
      ARTICLE_ACCESS_TTL_MS,
    );
    expect(ttlForEmailLinkPurpose("preferences_access")).toBe(
      PREFERENCES_ACCESS_TTL_MS,
    );
  });
});
