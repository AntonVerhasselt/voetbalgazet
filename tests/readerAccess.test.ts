import { describe, expect, it } from "vitest";
import { hasReaderAccess } from "../apps/web/src/lib/reader-access";

describe("reader access helper", () => {
  it("unlocks anonymous and verified Better Auth users only", () => {
    expect(hasReaderAccess({ isAnonymous: true })).toBe(true);
    expect(hasReaderAccess({ emailVerified: true })).toBe(true);
    expect(hasReaderAccess({ emailVerified: false })).toBe(false);
    expect(hasReaderAccess({})).toBe(false);
    expect(hasReaderAccess(null)).toBe(false);
  });
});
