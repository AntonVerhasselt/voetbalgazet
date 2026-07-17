import { describe, expect, it } from "vitest";
import {
  shouldAlertBounceSpike,
  shouldAlertComplaintSpike,
  SPIKE_MIN_QUEUED,
} from "../convex/lib/deliveryAlerts";
import { transactionalContentFingerprint } from "../convex/lib/transactionalTypes";

describe("delivery spike alerts", () => {
  it("requires minimum queued volume before bounce spike", () => {
    expect(
      shouldAlertBounceSpike({
        queuedCount: SPIKE_MIN_QUEUED - 1,
        bouncedCount: 10,
        alreadyAlerted: false,
      }),
    ).toBe(false);
  });

  it("fires when bounce rate exceeds 2%", () => {
    expect(
      shouldAlertBounceSpike({
        queuedCount: 100,
        bouncedCount: 3,
        alreadyAlerted: false,
      }),
    ).toBe(true);
  });

  it("does not re-alert after alreadyAlerted", () => {
    expect(
      shouldAlertBounceSpike({
        queuedCount: 100,
        bouncedCount: 10,
        alreadyAlerted: true,
      }),
    ).toBe(false);
  });

  it("fires complaint spike above threshold", () => {
    expect(
      shouldAlertComplaintSpike({
        queuedCount: 100,
        complainedCount: 1,
        alreadyAlerted: false,
      }),
    ).toBe(true);
  });
});

describe("transactionalContentFingerprint", () => {
  it("changes when draft content changes", () => {
    const a = transactionalContentFingerprint({
      subject: "Hallo",
      documentJson: '{"type":"doc"}',
    });
    const b = transactionalContentFingerprint({
      subject: "Hallo",
      documentJson: '{"type":"doc","content":[]}',
    });
    expect(a).not.toEqual(b);
  });
});
