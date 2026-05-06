import { PgBoss, type Job } from "pg-boss";
import { getDb } from "../db/client";
import { processAgentJob } from "./processing";
import { queueNameForJobType } from "./handlers";
import { logger } from "../logging/logger";

type QueuePayload = { agentJobId: string };

let bossPromise: Promise<PgBoss> | undefined;

export async function getJobQueue(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = startJobQueue();
  }
  return bossPromise;
}

async function startJobQueue(): Promise<PgBoss> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL. Set it to a Postgres connection string.");
  }

  const boss = new PgBoss(connectionString);
  boss.on("error", (error: Error) => {
    logger.error("pg-boss error", { error: error.message });
  });

  await boss.start();

  return boss;
}

export async function registerJobWorkers(
  boss: Pick<PgBoss, "createQueue" | "work">,
  process: (agentJobId: string) => Promise<void> = (agentJobId) => processAgentJob(getDb(), agentJobId),
) {
  await registerWorker(boss, "generate_strategy", process);
  await registerWorker(boss, "generate_module", process);
}

async function registerWorker(
  boss: Pick<PgBoss, "createQueue" | "work">,
  type: "generate_strategy" | "generate_module",
  process: (agentJobId: string) => Promise<void>,
) {
  const queueName = queueNameForJobType(type);
  await boss.createQueue(queueName);
  await boss.work<QueuePayload>(queueName, async (jobs: Job<QueuePayload>[]) => {
    for (const job of jobs) {
      await process(job.data.agentJobId);
    }
  });
}
