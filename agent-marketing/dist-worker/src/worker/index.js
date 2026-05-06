import { getJobQueue, registerJobWorkers } from "../lib/jobs/queue";
export async function startWorker() {
    const boss = await getJobQueue();
    await registerJobWorkers(boss);
    const shutdown = async () => {
        await boss.stop();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
void startWorker().catch((error) => {
    console.error("Worker failed to start", error);
    process.exit(1);
});
