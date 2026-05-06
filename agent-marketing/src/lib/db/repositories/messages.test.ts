import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../client";
import { createCampaign } from "./campaigns";
import { saveMessage, getMessagesByCampaign } from "./messages";
import type { CampaignBrief } from "../../campaign/types";

const brief: CampaignBrief = {
  startupName: "ChatCo",
  productDescription: "AI chat product",
  targetAudience: "Founders",
  problemSolved: "Communication",
  campaignGoal: "demo",
  competitors: [],
  tone: ["clear"],
};

describe("messages repository", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  let campaignId: string;

  beforeEach(async () => {
    db = await createTestDb();
    const campaign = await createCampaign(db, { brief });
    campaignId = campaign.id;
  });

  it("saves and retrieves a user message", async () => {
    await saveMessage(db, campaignId, { role: "user", content: "What should I tweet?" });
    const messages = await getMessagesByCampaign(db, campaignId);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("What should I tweet?");
  });

  it("returns multiple messages for the campaign", async () => {
    await saveMessage(db, campaignId, { role: "user", content: "First" });
    await saveMessage(db, campaignId, { role: "assistant", content: "Second" });
    const messages = await getMessagesByCampaign(db, campaignId);
    expect(messages).toHaveLength(2);
    const contents = messages.map((m) => m.content);
    expect(contents).toContain("First");
    expect(contents).toContain("Second");
  });

  it("respects the limit parameter", async () => {
    for (let i = 0; i < 10; i++) {
      await saveMessage(db, campaignId, { role: "user", content: `Message ${i}` });
    }
    const messages = await getMessagesByCampaign(db, campaignId, 5);
    expect(messages.length).toBeLessThanOrEqual(5);
  });

  it("persists messageType field", async () => {
    await saveMessage(db, campaignId, { role: "system", content: "event", messageType: "system_event" });
    const messages = await getMessagesByCampaign(db, campaignId);
    expect(messages[0].messageType).toBe("system_event");
  });
});
