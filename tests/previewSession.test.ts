import { describe, expect, it } from "vitest";
import {
  createPreviewToken,
  isAllowedPreviewBranch,
  isAllowedPreviewTarget,
  verifyPreviewToken,
} from "../apps/web/src/lib/preview-session";

describe("signed Keystatic preview sessions", () => {
  it("accepts a scoped branch and article target", () => {
    const now = Date.UTC(2026, 6, 16, 20, 0, 0);
    const token = createPreviewToken(
      "content/derby-reportage",
      "/nieuws/derby-reportage",
      now,
    );
    expect(verifyPreviewToken(token, now + 60_000)).toMatchObject({
      branch: "content/derby-reportage",
      target: "/nieuws/derby-reportage",
    });
  });

  it("rejects tampering, expiry, traversal and open redirects", () => {
    const now = Date.UTC(2026, 6, 16, 20, 0, 0);
    const token = createPreviewToken(
      "content/derby-reportage",
      "/nieuws/derby-reportage",
      now,
    );
    expect(verifyPreviewToken(`${token}x`, now)).toBeNull();
    expect(verifyPreviewToken(token, now + 16 * 60_000)).toBeNull();
    expect(isAllowedPreviewBranch("content/../secrets")).toBe(false);
    expect(isAllowedPreviewBranch("cursor/phase-3-admin-mvp")).toBe(false);
    expect(isAllowedPreviewBranch("master")).toBe(true);
    expect(isAllowedPreviewTarget("https://example.com")).toBe(false);
    expect(isAllowedPreviewTarget("//example.com/nieuws/test")).toBe(false);
  });
});
