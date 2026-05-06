import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../db/client";
import { createCampaign } from "../db/repositories/campaigns";
import { createAgentJob, failAgentJob, getAgentJob, listAgentJobsByCampaign, startAgentJob, succeedAgentJob } from "./repository";
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

describe("agent job repository", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  let campaignId: string;

  beforeEach(async () => {
    db = await createTestDb();
    const campaign = await createCampaign(db, { brief, userId: "user-1" });
    campaignId = campaign.id;
  });

  it("creates a queued job with typed payload", async () => {
    const job = await createAgentJob(db, {
      campaignId,
      userId: "user-1",
      type: "generate_module",
      payload: { module: "linkedin" },
    });

    expect(job.id).toBeTruthy();
    expect(job.status).toBe("queued");
    expect(job.payload).toEqual({ module: "linkedin" });
    expect(job.progress).toEqual({ step: "queued" });
  });

  it("tracks running, succeeded, and failed states", async () => {
    const job = await createAgentJob(db, {
      campaignId,
      userId: "user-1",
      type: "generate_strategy",
      payload: {},
    });

    await startAgentJob(db, job.id, { step: "generating_strategy" });
    expect((await getAgentJob(db, job.id))?.status).toBe("running");

    await succeedAgentJob(db, job.id, { step: "completed" });
    expect((await getAgentJob(db, job.id))?.status).toBe("succeeded");

    const failed = await createAgentJob(db, {
      campaignId,
      userId: "user-1",
      type: "generate_module",
      payload: { module: "x" },
    });
    await failAgentJob(db, failed.id, { message: "LLM timeout" });

    const reloaded = await getAgentJob(db, failed.id);
    expect(reloaded?.status).toBe("failed");
    expect(reloaded?.error?.message).toBe("LLM timeout");
  });

  it("increments attempts when a job starts", async () => {
    const job = await createAgentJob(db, {
      campaignId,
      userId: "user-1",
      type: "generate_strategy",
      payload: {},
    });

    await startAgentJob(db, job.id, { step: "running" });

    expect((await getAgentJob(db, job.id))?.attempts).toBe(1);
  });

  it("lists jobs for a campaign in newest-first order", async () => {
    await createAgentJob(db, { campaignId, userId: "user-1", type: "generate_strategy", payload: {} });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await createAgentJob(db, {
      campaignId,
      userId: "user-1",
      type: "generate_module",
      payload: { module: "creative" },
    });

    const jobs = await listAgentJobsByCampaign(db, campaignId);
    expect(jobs).toHaveLength(2);
    expect(jobs[0].id).toBe(second.id);
  });
});
