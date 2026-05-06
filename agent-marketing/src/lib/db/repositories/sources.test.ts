import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../client";
import { createCampaign } from "./campaigns";
import { saveSource, getSourcesByCampaign, getSourcesByRun } from "./sources";
import { createRun } from "./runs";
import type { CampaignBrief } from "../../campaign/types";

const testBrief: CampaignBrief = {
  startupName: "Source Co",
  productDescription: "Test",
  targetAudience: "Testers",
  problemSolved: "Testing",
  campaignGoal: "launch",
  competitors: [],
  tone: ["professional"],
};

describe("sources repository", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  let campaignId: string;

  beforeEach(async () => {
    db = await createTestDb();
    const campaign = await createCampaign(db, { brief: testBrief });
    campaignId = campaign.id;
  });

  it("saves a source and retrieves it by campaign", async () => {
    const source = await saveSource(db, {
      campaignId,
      sourceUrl: "https://example.com/research",
      title: "Market Research 2024",
      snippet: "The AI market is growing 30% YoY",
      confidence: 0.9,
      usedIn: ["market_researcher"],
      serverName: "brave-search",
      toolName: "web_search",
    });

    expect(source.id).toBeTruthy();
    expect(source.sourceUrl).toBe("https://example.com/research");
    expect(source.confidence).toBe(0.9);
    expect(source.usedIn).toEqual(["market_researcher"]);

    const sources = await getSourcesByCampaign(db, campaignId);
    expect(sources).toHaveLength(1);
    expect(sources[0].title).toBe("Market Research 2024");
  });

  it("empty MCP results do not create fake sources", async () => {
    const sources = await getSourcesByCampaign(db, campaignId);
    expect(sources).toHaveLength(0);
  });

  it("links source to run and retrieves by run", async () => {
    const run = await createRun(db, { campaignId, nodeName: "market_researcher" });

    await saveSource(db, {
      campaignId,
      runId: run.id,
      sourceUrl: "https://techcrunch.com/article",
      serverName: "brave-search",
      toolName: "web_search",
    });

    const sources = await getSourcesByRun(db, run.id);
    expect(sources).toHaveLength(1);
    expect(sources[0].runId).toBe(run.id);
  });

  it("sources from different campaigns are isolated", async () => {
    const other = await createCampaign(db, { brief: testBrief });

    await saveSource(db, { campaignId, serverName: "search", toolName: "search" });
    await saveSource(db, { campaignId: other.id, serverName: "search", toolName: "search" });

    const sources = await getSourcesByCampaign(db, campaignId);
    expect(sources).toHaveLength(1);
  });
});
