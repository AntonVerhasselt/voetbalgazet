import { describe, expect, it } from "vitest";
import { normalizeAndValidateEmail } from "../convex/lib/email";

describe("normalizeAndValidateEmail", () => {
  it("normalizes casing, Unicode width, and whitespace", () => {
    expect(normalizeAndValidateEmail("  REDACTIE@Voorbeeld.BE  ")).toBe(
      "redactie@voorbeeld.be",
    );
  });

  it.each([
    "",
    "zonder-apenstaart",
    "naam@domein",
    "naam met spatie@voorbeeld.be",
    `${"a".repeat(250)}@b.be`,
  ])("rejects invalid email %j", (email) => {
    expect(() => normalizeAndValidateEmail(email)).toThrow(
      "Vul een geldig e-mailadres in.",
    );
  });
});
