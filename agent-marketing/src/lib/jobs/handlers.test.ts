import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "../db/client";
import { createCampaign } from "../db/repositories/campaigns";
import { getAgentJob } from "./repository";
import { enqueueAgentJob, queueNameForJobType, type BossQueueClient } from "./handlers";
import type { CampaignBrief } from "../campaign/types";

const brief: CampaignBrief = {
  startupName: "QueueCo",
  productDescription: "Async campaign generation",
  targetAudience: "Founders",
  problemSolved: "Long running LLM tasks",
  campaignGoal: "launch",
  competitors: [],
  tone: ["clear"],
};

describe("job handlers", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  let campaignId: string;
  let boss: BossQueueClient;

  beforeEach(async () => {
    db = await createTestDb();
    const campaign = await createCampaign(db, { brief, userId: "user-1" });
    campaignId = campaign.id;
    boss = {
      createQueue: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue("boss-job-1"),
    };
  });

  it("enqueues a generate module job and stores boss job id", async () => {
    const job = await enqueueAgentJob(db, boss, {
      campaignId,
      userId: "user-1",
      type: "generate_module",
      payload: { module: "linkedin" },
    });

    expect(boss.createQueue).toHaveBeenCalledWith(queueNameForJobType("generate_module"));
    expect(boss.send).toHaveBeenCalledWith(queueNameForJobType("generate_module"), {
      agentJobId: job.id,
    });

    const saved = await getAgentJob(db, job.id);
    expect(saved?.bossJobId).toBe("boss-job-1");
    expect(saved?.status).toBe("queued");
    expect(saved?.payload).toEqual({ module: "linkedin" });
  });
});
