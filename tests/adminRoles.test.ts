import { describe, expect, it } from "vitest";
import { parseBootstrapRoleMap } from "../convex/lib/adminRoles";

describe("parseBootstrapRoleMap", () => {
  it("normalizes configured email addresses", () => {
    const roles = parseBootstrapRoleMap(
      '{" Redactie@Voorbeeld.be ":"journalist"}',
    );

    expect(roles.get("redactie@voorbeeld.be")).toBe("journalist");
  });

  it("returns an empty map when no bootstrap config exists", () => {
    expect(parseBootstrapRoleMap(undefined).size).toBe(0);
  });

  it.each([
    "[]",
    '{"redactie@example.be":"owner"}',
    '{"":"admin"}',
    "{not-json}",
  ])("rejects malformed configuration %j", (value) => {
    expect(() => parseBootstrapRoleMap(value)).toThrow(
      "ADMIN_BOOTSTRAP_ROLE_MAP",
    );
  });
});
