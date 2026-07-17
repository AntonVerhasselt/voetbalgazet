import { describe, expect, it } from "vitest";
import { mergeCampaignStatusPages } from "../convex/lib/campaignList";
import {
  shouldAlertBounceSpike,
  shouldAlertComplaintSpike,
  SPIKE_MIN_QUEUED,
  BOUNCE_SPIKE_RATE,
} from "../convex/lib/deliveryAlerts";
import {
  seedForType,
  transactionalContentFingerprint,
  TRANSACTIONAL_TYPE_SEEDS,
} from "../convex/lib/transactionalTypes";
import type { Doc } from "../convex/_generated/dataModel";

function campaign(
  overrides: Partial<Doc<"newsletterCampaigns">> & {
    _id: string;
    updatedAt: number;
    status: Doc<"newsletterCampaigns">["status"];
  },
): Doc<"newsletterCampaigns"> {
  return {
    _creationTime: overrides.updatedAt,
    internalName: "Test",
    subject: "Subject",
    status: overrides.status,
    documentJson: "{}",
    revisionNumber: 1,
    timezone: "Europe/Brussels",
    senderProfileId: "emailSenderProfiles_1" as Doc<"newsletterCampaigns">["senderProfileId"],
    createdBy: "users_1" as Doc<"newsletterCampaigns">["createdBy"],
    updatedBy: "users_1" as Doc<"newsletterCampaigns">["updatedBy"],
    createdAt: overrides.updatedAt,
    updatedAt: overrides.updatedAt,
    _id: overrides._id as Doc<"newsletterCampaigns">["_id"],
    ...overrides,
  };
}

describe("mergeCampaignStatusPages pagination correctness", () => {
  it("does not report isDone when a status bucket may have more rows", () => {
    // Each status returned a full page of numItems — more may exist.
    const scheduled = Array.from({ length: 5 }, (_, i) =>
      campaign({
        _id: `s${i}`,
        status: "scheduled",
        updatedAt: 1000 - i,
      }),
    );
    const preparing = Array.from({ length: 5 }, (_, i) =>
      campaign({
        _id: `p${i}`,
        status: "preparing",
        updatedAt: 999 - i,
      }),
    );
    const result = mergeCampaignStatusPages([scheduled, preparing], 5);
    expect(result.page).toHaveLength(5);
    expect(result.isDone).toBe(false);
  });

  it("avoids infinite empty-page loops from the old broad-filter approach", () => {
    // Sparse matching statuses mixed into larger sets — cursor advances via updatedAt.
    const sent = [
      campaign({ _id: "a", status: "sent", updatedAt: 50 }),
      campaign({ _id: "b", status: "failed", updatedAt: 40 }),
    ];
    const cancelled = [
      campaign({ _id: "c", status: "cancelled", updatedAt: 45 }),
    ];
    const page = mergeCampaignStatusPages([sent, cancelled], 2);
    expect(page.page.map((c) => c._id)).toEqual(["a", "c"]);
    expect(page.continueCursor).toBe("45");
    expect(page.isDone).toBe(false);

    const nextSent = sent.filter((c) => c.updatedAt < 45);
    const nextCancelled = cancelled.filter((c) => c.updatedAt < 45);
    const page2 = mergeCampaignStatusPages([nextSent, nextCancelled], 2);
    expect(page2.page.map((c) => c._id)).toEqual(["b"]);
    expect(page2.isDone).toBe(true);
  });
});

describe("transactional type seeds", () => {
  it("includes all planned dienstmail types", () => {
    const types = TRANSACTIONAL_TYPE_SEEDS.map((s) => s.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "welcome",
        "magic_link",
        "verify_email",
        "unsubscribe_confirmed",
        "preferences_changed",
        "admin_send_alert",
      ]),
    );
  });

  it("welcome seed requires confirmUrl for signup flow", () => {
    const welcome = seedForType("welcome");
    expect(welcome.requiredVariableKeys).toContain("confirmUrl");
    expect(welcome.documentJson).toContain("{{confirmUrl}}");
  });

  it("fingerprint gates republish after edits", () => {
    const base = {
      subject: "Welkom",
      preheader: "hi",
      documentJson: seedForType("welcome").documentJson,
    };
    const before = transactionalContentFingerprint(base);
    const after = transactionalContentFingerprint({
      ...base,
      subject: "Welkom bij De Voetbalgazet",
    });
    expect(before).not.toBe(after);
  });
});

describe("spike alert thresholds align with ops plan", () => {
  it("bounce warning is > 2%", () => {
    expect(BOUNCE_SPIKE_RATE).toBe(0.02);
    expect(
      shouldAlertBounceSpike({
        queuedCount: SPIKE_MIN_QUEUED,
        bouncedCount: Math.floor(SPIKE_MIN_QUEUED * 0.02),
        alreadyAlerted: false,
      }),
    ).toBe(false);
    expect(
      shouldAlertBounceSpike({
        queuedCount: SPIKE_MIN_QUEUED,
        bouncedCount: Math.floor(SPIKE_MIN_QUEUED * 0.02) + 1,
        alreadyAlerted: false,
      }),
    ).toBe(true);
  });

  it("complaint spike needs volume and rate", () => {
    expect(
      shouldAlertComplaintSpike({
        queuedCount: 10,
        complainedCount: 1,
        alreadyAlerted: false,
      }),
    ).toBe(false);
    expect(
      shouldAlertComplaintSpike({
        queuedCount: SPIKE_MIN_QUEUED,
        complainedCount: 1,
        alreadyAlerted: false,
      }),
    ).toBe(true);
  });
});
