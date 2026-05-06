import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "../db/client";
import { createCampaign } from "../db/repositories/campaigns";
import { createAgentJob, getAgentJob } from "./repository";
import { processAgentJob } from "./processing";
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

describe("job processing", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  let campaignId: string;

  beforeEach(async () => {
    db = await createTestDb();
    const campaign = await createCampaign(db, { brief, userId: "user-1" });
    campaignId = campaign.id;
  });

  it("processes a generate strategy job and marks it succeeded", async () => {
    const runner = {
      generateStrategy: vi.fn().mockResolvedValue(undefined),
      generateModule: vi.fn(),
    };

    const job = await createAgentJob(db, {
      campaignId,
      userId: "user-1",
      type: "generate_strategy",
      payload: {},
    });

    await processAgentJob(db, job.id, runner);

    expect(runner.generateStrategy).toHaveBeenCalledWith(campaignId, "user-1");
    const updated = await getAgentJob(db, job.id);
    expect(updated?.status).toBe("succeeded");
    expect(updated?.progress).toEqual({ step: "completed" });
  });

  it("processes a generate module job and passes module payload", async () => {
    const runner = {
      generateStrategy: vi.fn(),
      generateModule: vi.fn().mockResolvedValue(undefined),
    };

    const job = await createAgentJob(db, {
      campaignId,
      userId: "user-1",
      type: "generate_module",
      payload: { module: "linkedin" },
    });

    await processAgentJob(db, job.id, runner);

    expect(runner.generateModule).toHaveBeenCalledWith(campaignId, "linkedin", "user-1");
    expect((await getAgentJob(db, job.id))?.status).toBe("succeeded");
  });

  it("marks job failed when runner throws", async () => {
    const runner = {
      generateStrategy: vi.fn().mockRejectedValue(new Error("provider overloaded")),
      generateModule: vi.fn(),
    };

    const job = await createAgentJob(db, {
      campaignId,
      userId: "user-1",
      type: "generate_strategy",
      payload: {},
    });

    await processAgentJob(db, job.id, runner);

    const updated = await getAgentJob(db, job.id);
    expect(updated?.status).toBe("failed");
    expect(updated?.error?.message).toBe("provider overloaded");
  });

  it("retries once on transient overload before succeeding", async () => {
    const runner = {
      generateStrategy: vi
        .fn()
        .mockRejectedValueOnce(new Error('{"code":"server_is_overloaded"}'))
        .mockResolvedValueOnce(undefined),
      generateModule: vi.fn(),
    };

    const job = await createAgentJob(db, {
      campaignId,
      userId: "user-1",
      type: "generate_strategy",
      payload: {},
    });

    await processAgentJob(db, job.id, runner);

    expect(runner.generateStrategy).toHaveBeenCalledTimes(2);
    const updated = await getAgentJob(db, job.id);
    expect(updated?.status).toBe("succeeded");
    expect(updated?.progress).toEqual({ step: "completed" });
  });
});
