import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, DEFAULT_USER_ID } from "../client";
import { createCampaign } from "./campaigns";
import { createRun, completeRun, failRun, getRun, getRunsByCampaign } from "./runs";
import type { CampaignBrief } from "../../campaign/types";

const testBrief: CampaignBrief = {
  startupName: "Test Co",
  productDescription: "Test product",
  targetAudience: "Testers",
  problemSolved: "Testing",
  campaignGoal: "launch",
  competitors: [],
  tone: ["professional"],
};

describe("runs repository", () => {
  let db: ReturnType<typeof createTestDb>;
  let campaignId: string;

  beforeEach(async () => {
    db = createTestDb();
    const campaign = await createCampaign(db, { brief: testBrief });
    campaignId = campaign.id;
  });

  it("creates a run with running status", async () => {
    const run = await createRun(db, {
      campaignId,
      nodeName: "market_researcher",
      model: "deepseek-v4-flash",
      stateBefore: "draft_brief",
    });

    expect(run.id).toBeTruthy();
    expect(run.status).toBe("running");
    expect(run.nodeName).toBe("market_researcher");
    expect(run.stateBefore).toBe("draft_brief");
    expect(run.completedAt).toBeUndefined();
  });

  it("completes a run successfully", async () => {
    const run = await createRun(db, { campaignId, nodeName: "positioning_strategist" });
    await completeRun(db, run.id, { stateAfter: "strategy_ready", latencyMs: 1234 });

    const updated = await getRun(db, run.id);
    expect(updated!.status).toBe("success");
    expect(updated!.stateAfter).toBe("strategy_ready");
    expect(updated!.latencyMs).toBe(1234);
    expect(updated!.completedAt).toBeDefined();
  });

  it("failed run logs typed error and does not mark success", async () => {
    const run = await createRun(db, { campaignId, nodeName: "positioning_strategist" });
    await failRun(db, run.id, { type: "schema_validation_exhausted", message: "Max retries exceeded" });

    const updated = await getRun(db, run.id);
    expect(updated!.status).toBe("failed");
    expect(updated!.errorType).toBe("schema_validation_exhausted");
    expect(updated!.errorMessage).toBe("Max retries exceeded");
    expect(updated!.stateAfter).toBeUndefined();
  });

  it("lists all runs for a campaign", async () => {
    await createRun(db, { campaignId, nodeName: "market_researcher" });
    await createRun(db, { campaignId, nodeName: "positioning_strategist" });

    const runs = await getRunsByCampaign(db, campaignId);
    expect(runs).toHaveLength(2);
    const nodeNames = runs.map((r) => r.nodeName);
    expect(nodeNames).toContain("market_researcher");
    expect(nodeNames).toContain("positioning_strategist");
  });
});
