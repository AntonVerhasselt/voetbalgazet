import { describe, expect, it } from "vitest";
import { mergeCampaignStatusPages } from "../convex/lib/campaignList";
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
    editorFormat: "react-email-editor",
    editorFormatVersion: 1,
    rendererVersion: "1",
    themeVersion: "1",
    createdBy: "users_1" as Doc<"newsletterCampaigns">["createdBy"],
    updatedBy: "users_1" as Doc<"newsletterCampaigns">["updatedBy"],
    createdAt: overrides.updatedAt,
    updatedAt: overrides.updatedAt,
    _id: overrides._id as Doc<"newsletterCampaigns">["_id"],
    ...overrides,
  };
}

describe("mergeCampaignStatusPages", () => {
  it("merges statuses by updatedAt and paginates without false isDone", () => {
    const scheduled = [
      campaign({ _id: "c1", status: "scheduled", updatedAt: 300 }),
      campaign({ _id: "c2", status: "scheduled", updatedAt: 100 }),
    ];
    const sending = [
      campaign({ _id: "c3", status: "sending", updatedAt: 200 }),
    ];
    const page1 = mergeCampaignStatusPages([scheduled, sending], 2);
    expect(page1.page.map((c) => c._id)).toEqual(["c1", "c3"]);
    expect(page1.isDone).toBe(false);
    expect(page1.continueCursor).toBe("200");
  });

  it("marks isDone when every status bucket is exhausted", () => {
    const scheduled = [
      campaign({ _id: "c1", status: "scheduled", updatedAt: 30 }),
    ];
    const sending = [
      campaign({ _id: "c2", status: "sending", updatedAt: 20 }),
    ];
    const result = mergeCampaignStatusPages([scheduled, sending], 5);
    expect(result.page).toHaveLength(2);
    expect(result.isDone).toBe(true);
  });
});
