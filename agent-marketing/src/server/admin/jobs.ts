import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../../lib/db/client";
import { getAgentJob, cancelAgentJob, listAgentJobsByCampaign, listAllAgentJobsByUser } from "../../lib/jobs/repository";
import { enqueueAgentJob } from "../../lib/jobs/handlers";
import { getCurrentUserId } from "../../lib/auth/user";
import { getJobQueue } from "../../lib/jobs/queue";
import { writeAuditEvent } from "../../lib/audit/logger";

export const adminListAllJobsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = getCurrentUserId();
    return listAllAgentJobsByUser(getDb(), userId);
  });

export const adminListJobsFn = createServerFn({ method: "GET" })
  .inputValidator((input: { campaignId: string }) => input)
  .handler(async ({ data }) => {
    getCurrentUserId(); // auth check
    return listAgentJobsByCampaign(getDb(), data.campaignId);
  });

export const adminRetryJobFn = createServerFn({ method: "POST" })
  .inputValidator((input: { jobId: string }) => input)
  .handler(async ({ data }) => {
    const userId = getCurrentUserId();
    const db = getDb();
    const job = await getAgentJob(db, data.jobId);
    if (!job) throw new Error("Job not found.");
    if (job.userId !== userId) throw new Error("Job not found.");
    if (job.status !== "failed") throw new Error("Only failed jobs can be retried.");

    const boss = await getJobQueue();
    const newJob = await enqueueAgentJob(db, boss, {
      campaignId: job.campaignId,
      userId: job.userId,
      type: job.type,
      payload: job.payload,
    });

    await writeAuditEvent(db, {
      event: "job.enqueued",
      userId,
      campaignId: job.campaignId,
      jobId: newJob.id,
      meta: { type: job.type, retriedFromJobId: job.id },
    });

    return newJob;
  });

export const adminCancelJobFn = createServerFn({ method: "POST" })
  .inputValidator((input: { jobId: string }) => input)
  .handler(async ({ data }) => {
    const userId = getCurrentUserId();
    const db = getDb();
    const job = await getAgentJob(db, data.jobId);
    if (!job) throw new Error("Job not found.");
    if (job.userId !== userId) throw new Error("Job not found.");

    const cancelled = await cancelAgentJob(db, data.jobId);
    if (!cancelled) throw new Error("Job cannot be cancelled in its current state.");

    await writeAuditEvent(db, {
      event: "job.cancelled",
      userId,
      campaignId: job.campaignId,
      jobId: job.id,
    });

    return cancelled;
  });
