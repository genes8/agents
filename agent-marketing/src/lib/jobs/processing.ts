import { generateModuleHandler, generateStrategyHandler } from "../workflow/campaign-orchestrator";
import type { CampaignModule } from "../campaign/types";
import type { Db } from "../db/client";
import { failAgentJob, getAgentJob, startAgentJob, succeedAgentJob } from "./repository";
import type { AgentJobId } from "./types";
import { logger } from "../logging/logger";
import { writeAuditEvent } from "../audit/logger";
import { captureException } from "../observability/sentry";

type JobRunner = {
  generateStrategy: (campaignId: string, userId: string) => Promise<unknown>;
  generateModule: (campaignId: string, module: CampaignModule, userId: string) => Promise<unknown>;
};

const defaultRunner: JobRunner = {
  generateStrategy: generateStrategyHandler,
  generateModule: generateModuleHandler,
};

export async function processAgentJob(db: Db, jobId: AgentJobId, runner: JobRunner = defaultRunner): Promise<void> {
  const job = await getAgentJob(db, jobId);
  if (!job) {
    throw new Error(`Agent job not found: ${jobId}`);
  }

  if (job.status === "cancelled") {
    logger.info("job.skipped.cancelled", { jobId: job.id, campaignId: job.campaignId });
    return;
  }

  logger.info("job.started", { jobId: job.id, campaignId: job.campaignId, type: job.type });
  await startAgentJob(db, job.id, { step: "running" });
  await writeAuditEvent(db, { event: "job.started", userId: job.userId, campaignId: job.campaignId, jobId: job.id });

  const start = Date.now();

  try {
    await runWithRetry(async () => {
      switch (job.type) {
        case "generate_strategy":
          await runner.generateStrategy(job.campaignId, job.userId);
          break;
        case "generate_module": {
          const module = "module" in job.payload ? job.payload.module : undefined;
          if (!module) {
            throw new Error("Generate module job is missing module payload.");
          }
          await runner.generateModule(job.campaignId, module, job.userId);
          break;
        }
        default:
          throw new Error(`Unsupported queued job type: ${job.type}`);
      }
    });

    const latencyMs = Date.now() - start;
    logger.info("job.succeeded", { jobId: job.id, campaignId: job.campaignId, type: job.type, latencyMs });
    await succeedAgentJob(db, job.id, { step: "completed" });
    await writeAuditEvent(db, { event: "job.succeeded", userId: job.userId, campaignId: job.campaignId, jobId: job.id, meta: { latencyMs } });
  } catch (error) {
    const latencyMs = Date.now() - start;
    const message = error instanceof Error ? error.message : "Unknown job processing error";
    logger.error("job.failed", { jobId: job.id, campaignId: job.campaignId, type: job.type, latencyMs, error: message });
    captureException(error, { jobId: job.id, campaignId: job.campaignId, type: job.type });
    await failAgentJob(db, job.id, { message, type: "job_processing_error" });
    await writeAuditEvent(db, { event: "job.failed", userId: job.userId, campaignId: job.campaignId, jobId: job.id, meta: { latencyMs, error: message } });
  }
}

async function runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isTransientJobError(error)) {
      throw error;
    }

    return fn();
  }
}

function isTransientJobError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /server_is_overloaded|service_unavailable_error|timeout/i.test(message);
}
