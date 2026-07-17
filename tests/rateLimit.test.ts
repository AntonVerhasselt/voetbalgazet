import { describe, expect, it } from "vitest";
import { hashRateLimitValue } from "../convex/lib/rateLimit";

describe("signup rate-limit keys", () => {
  it("are deterministic without storing the email address", () => {
    const email = "reader@example.com";
    const hash = hashRateLimitValue(email);
    expect(hash).toBe(hashRateLimitValue(email));
    expect(hash).not.toContain(email);
    expect(hash).toMatch(/^[0-9a-f]{8}$/u);
  });

  it("differ for different addresses", () => {
    expect(hashRateLimitValue("one@example.com")).not.toBe(
      hashRateLimitValue("two@example.com"),
    );
  });
});
