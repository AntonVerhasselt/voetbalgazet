import { describe, expect, it } from "vitest";
import { isHardBounceEvent } from "../convex/lib/bounce";

describe("isHardBounceEvent", () => {
  it("treats Resend Permanent as hard bounce", () => {
    expect(isHardBounceEvent("email.bounced", "Permanent", "General")).toBe(
      true,
    );
    expect(isHardBounceEvent("email.bounced", "Permanent", "Suppressed")).toBe(
      true,
    );
  });

  it("does not suppress Temporary/Transient bounces", () => {
    expect(isHardBounceEvent("email.bounced", "Temporary", "General")).toBe(
      false,
    );
    expect(isHardBounceEvent("email.bounced", "Transient", "MailboxFull")).toBe(
      false,
    );
  });

  it("treats Undetermined and missing type on email.bounced as hard", () => {
    expect(isHardBounceEvent("email.bounced", "Undetermined", undefined)).toBe(
      true,
    );
    expect(isHardBounceEvent("email.bounced", undefined, undefined)).toBe(true);
  });

  it("keeps legacy hard substring matching", () => {
    expect(isHardBounceEvent("email.bounced", "hard", undefined)).toBe(true);
    expect(isHardBounceEvent("email.bounced", "Soft", "hard_bounce")).toBe(
      true,
    );
  });

  it("ignores non-bounce events", () => {
    expect(isHardBounceEvent("email.delivered", "Permanent", undefined)).toBe(
      false,
    );
    expect(
      isHardBounceEvent("email.delivery_delayed", "Temporary", undefined),
    ).toBe(false);
  });
});
