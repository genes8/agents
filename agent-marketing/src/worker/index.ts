import { pathToFileURL } from "node:url";
import { getJobQueue, registerJobWorkers } from "../lib/jobs/queue";
import { initSentry } from "../lib/observability/sentry";
import { logger } from "../lib/logging/logger";

export async function startWorker(): Promise<void> {
  initSentry();
  logger.info("worker.starting");

  const boss = await getJobQueue();
  await registerJobWorkers(boss);

  logger.info("worker.ready");

  const shutdown = async () => {
    logger.info("worker.stopping");
    await boss.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryUrl === import.meta.url) {
  void startWorker().catch((error) => {
    console.error("Worker failed to start", error);
    process.exit(1);
  });
}
