import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../client";
import { createCampaign } from "./campaigns";
import { getExportEventsByCampaign, saveExportEvent } from "./exports";
import type { CampaignBrief } from "../../campaign/types";

const testBrief: CampaignBrief = {
  startupName: "Export Co",
  productDescription: "Test",
  targetAudience: "Testers",
  problemSolved: "Testing",
  campaignGoal: "launch",
  competitors: [],
  tone: ["professional"],
};

describe("exports repository", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  let campaignId: string;

  beforeEach(async () => {
    db = await createTestDb();
    const campaign = await createCampaign(db, { brief: testBrief });
    campaignId = campaign.id;
  });

  it("returns an empty list when no export events exist", async () => {
    const events = await getExportEventsByCampaign(db, campaignId);
    expect(events).toEqual([]);
  });

  it("saves an export event and lists it by campaign", async () => {
    const event = await saveExportEvent(db, {
      campaignId,
      userId: "user-123",
      format: "pdf",
    });

    expect(event.id).toBeTruthy();
    expect(event.campaignId).toBe(campaignId);
    expect(event.format).toBe("pdf");

    const events = await getExportEventsByCampaign(db, campaignId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: event.id,
      campaignId,
      userId: "user-123",
      format: "pdf",
    });
  });

  it("persists the user id on export events", async () => {
    await saveExportEvent(db, {
      campaignId,
      userId: "user-456",
      format: "csv",
    });

    const events = await getExportEventsByCampaign(db, campaignId);
    expect(events[0].userId).toBe("user-456");
  });
});
