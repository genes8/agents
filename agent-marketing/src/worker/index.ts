import { pathToFileURL } from "node:url";
import { getJobQueue, registerJobWorkers } from "../lib/jobs/queue";

export async function startWorker(): Promise<void> {
  const boss = await getJobQueue();
  await registerJobWorkers(boss);

  const shutdown = async () => {
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
