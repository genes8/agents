import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDbWithCleanup, DEFAULT_USER_ID, type Db } from "../client";
import { createCampaign, getCampaign, listCampaigns, saveStrategy, upsertModule } from "./campaigns";
import type { CampaignBrief, CampaignStrategy } from "../../campaign/types";

const testBrief: CampaignBrief = {
  startupName: "Acme AI",
  productDescription: "AI-powered GTM tool",
  targetAudience: "B2B founders",
  problemSolved: "Slow GTM",
  campaignGoal: "launch",
  competitors: ["Competitor A"],
  tone: ["professional"],
};

const testStrategy: CampaignStrategy = {
  marketSummary: "Growing B2B AI market",
  icp: "Series A founders",
  painPoints: ["slow GTM", "no positioning"],
  positioningStatement: "The fastest GTM for B2B startups",
  messagingPillars: [{ name: "Speed", description: "10x faster", proofPoints: ["2 hours vs 2 weeks"] }],
  brandVoice: { tone: ["professional", "bold"], avoid: ["jargon"] },
  hooks: ["10x your GTM speed"],
  channelStrategy: { x: "short punchy posts", linkedin: "thought leadership", instagram: "visual case studies" },
};

describe("campaigns repository", () => {
  let db: Db;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await createTestDbWithCleanup());
  });
  afterEach(async () => {
    await cleanup();
  });

  it("creates campaign and returns draft_brief workspace", async () => {
    const workspace = await createCampaign(db, { brief: testBrief });

    expect(workspace.id).toBeTruthy();
    expect(workspace.workspaceId).toBe(workspace.id);
    expect(workspace.name).toBe("Acme AI");
    expect(workspace.workflowState).toBe("draft_brief");
    expect(workspace.brief.startupName).toBe("Acme AI");
    expect(workspace.modules).toHaveLength(0);
    expect(workspace.strategy).toBeUndefined();
    expect(workspace.userId).toBe(DEFAULT_USER_ID);
  });

  it("reloads full workspace after creation", async () => {
    const created = await createCampaign(db, { brief: testBrief });
    const reloaded = await getCampaign(db, created.id);

    expect(reloaded).not.toBeNull();
    expect(reloaded!.id).toBe(created.id);
    expect(reloaded!.workspaceId).toBe(created.id);
    expect(reloaded!.brief.startupName).toBe("Acme AI");
    expect(reloaded!.workflowState).toBe("draft_brief");
    expect(reloaded!.modules).toHaveLength(0);
  });

  it("returns null for non-existent campaign", async () => {
    const result = await getCampaign(db, "non-existent-id");
    expect(result).toBeNull();
  });

  it("enforces ownership: user B cannot load user A campaign", async () => {
    const campaign = await createCampaign(db, { brief: testBrief, userId: "user-a" });
    const result = await getCampaign(db, campaign.id, "user-b");
    expect(result).toBeNull();
  });

  it("saves strategy and transitions to strategy_ready", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);

    const reloaded = await getCampaign(db, campaign.id);
    expect(reloaded!.workflowState).toBe("strategy_ready");
    expect(reloaded!.strategy?.marketSummary).toBe("Growing B2B AI market");
  });

  it("upserts module without duplicating", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);

    const moduleOutput = {
      module: "linkedin" as const,
      title: "LinkedIn Strategy",
      summary: "Posts for LinkedIn",
      sections: [{ title: "Posts", items: ["Post 1", "Post 2"] }],
    };

    await upsertModule(db, campaign.id, "linkedin", moduleOutput);
    await upsertModule(db, campaign.id, "linkedin", { ...moduleOutput, title: "Updated LinkedIn" });

    const reloaded = await getCampaign(db, campaign.id);
    expect(reloaded!.modules).toHaveLength(1);
    expect(reloaded!.modules[0].output.title).toBe("Updated LinkedIn");
  });

  it("first module transitions strategy_ready → modules_ready", async () => {
    const campaign = await createCampaign(db, { brief: testBrief });
    await saveStrategy(db, campaign.id, testStrategy);

    await upsertModule(db, campaign.id, "linkedin", {
      module: "linkedin",
      title: "LinkedIn",
      summary: "LinkedIn posts",
      sections: [],
    });

    const reloaded = await getCampaign(db, campaign.id);
    expect(reloaded!.workflowState).toBe("modules_ready");
  });

  it("lists only campaigns for the requesting user", async () => {
    await createCampaign(db, { brief: testBrief, userId: "user-a" });
    await createCampaign(db, { brief: testBrief, userId: "user-b" });

    const listA = await listCampaigns(db, "user-a");
    const listB = await listCampaigns(db, "user-b");

    expect(listA).toHaveLength(1);
    expect(listB).toHaveLength(1);
    expect(listA).toHaveLength(1);
  });
});
