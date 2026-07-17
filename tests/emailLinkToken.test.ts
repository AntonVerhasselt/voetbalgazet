import { describe, expect, it } from "vitest";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "../apps/web/src/lib/email-link-token";

describe("unsubscribe email tokens", () => {
  it("round-trips a valid token", () => {
    const now = Date.UTC(2026, 6, 17, 12, 0, 0);
    const token = createUnsubscribeToken("Reader@Example.com", now);
    expect(verifyUnsubscribeToken(token, now + 1000)).toMatchObject({
      email: "reader@example.com",
      purpose: "unsubscribe",
    });
  });

  it("rejects tampered or expired tokens", () => {
    const now = Date.UTC(2026, 6, 17, 12, 0, 0);
    const token = createUnsubscribeToken("reader@example.com", now, 60_000);
    expect(verifyUnsubscribeToken(`${token}x`, now)).toBeNull();
    expect(verifyUnsubscribeToken(token, now + 120_000)).toBeNull();
  });
});
