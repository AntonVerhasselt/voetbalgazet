import { afterEach, describe, expect, it } from "vitest";
import {
  AGENT_ACCESS_SECRET_MIN_LENGTH,
  AGENT_EMAIL,
  checkAgentAccessRateLimit,
  deriveAgentPassword,
  getAgentAccessSecret,
  isAgentAccessEnabled,
  recordAgentAccessFailure,
  resetAgentAccessRateLimitsForTests,
  secretsEqual,
  verifyAgentAccessSecret,
} from "../apps/web/src/lib/agent-access";
import {
  deriveAgentPassword as deriveShared,
  readConfiguredAgentAccessSecret,
  secretsEqual as sharedSecretsEqual,
} from "../convex/lib/agentAccessShared";

describe("agent access secret gating", () => {
  const original = process.env.AGENT_ACCESS_SECRET;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.AGENT_ACCESS_SECRET;
    } else {
      process.env.AGENT_ACCESS_SECRET = original;
    }
    resetAgentAccessRateLimitsForTests();
  });

  it("treats unset secret as disabled", () => {
    delete process.env.AGENT_ACCESS_SECRET;
    expect(isAgentAccessEnabled()).toBe(false);
    expect(getAgentAccessSecret()).toBeNull();
    expect(readConfiguredAgentAccessSecret(undefined)).toBeNull();
  });

  it("treats short secret as disabled", () => {
    process.env.AGENT_ACCESS_SECRET = "x".repeat(AGENT_ACCESS_SECRET_MIN_LENGTH - 1);
    expect(isAgentAccessEnabled()).toBe(false);
    expect(verifyAgentAccessSecret("x".repeat(AGENT_ACCESS_SECRET_MIN_LENGTH - 1))).toBe(
      false,
    );
  });

  it("accepts a correct secret with constant-time compare", () => {
    const secret = `test-agent-secret-${"a".repeat(32)}`;
    process.env.AGENT_ACCESS_SECRET = secret;
    expect(isAgentAccessEnabled()).toBe(true);
    expect(verifyAgentAccessSecret(secret)).toBe(true);
    expect(verifyAgentAccessSecret(`${secret}!`)).toBe(false);
    expect(secretsEqual(secret, secret)).toBe(true);
    expect(sharedSecretsEqual(secret, "nope")).toBe(false);
  });

  it("derives a stable password from the secret", async () => {
    const secret = `test-agent-secret-${"b".repeat(32)}`;
    const first = await deriveAgentPassword(secret);
    const second = await deriveShared(secret);
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(await deriveAgentPassword(`${secret}x`)).not.toBe(first);
  });

  it("uses the fixed agent email", () => {
    expect(AGENT_EMAIL).toBe("cursor-agent@agents.devoetbalgazet.local");
  });

  it("rate limits repeated failures per ip hash", () => {
    const ipHash = "test-ip";
    for (let i = 0; i < 10; i += 1) {
      expect(checkAgentAccessRateLimit(ipHash).allowed).toBe(true);
      recordAgentAccessFailure(ipHash);
    }
    expect(checkAgentAccessRateLimit(ipHash)).toEqual({
      allowed: false,
      reason: "failures",
    });
  });
});
