import { PgBoss } from "pg-boss";
import { getDb } from "../db/client";
import { processAgentJob } from "./processing";
import { queueNameForJobType } from "./handlers";
let bossPromise;
export async function getJobQueue() {
    if (!bossPromise) {
        bossPromise = startJobQueue();
    }
    return bossPromise;
}
async function startJobQueue() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("Missing DATABASE_URL. Set it to a Postgres connection string.");
    }
    const boss = new PgBoss(connectionString);
    boss.on("error", (error) => {
        console.error("pg-boss error", error);
    });
    await boss.start();
    return boss;
}
export async function registerJobWorkers(boss, process = (agentJobId) => processAgentJob(getDb(), agentJobId)) {
    await registerWorker(boss, "generate_strategy", process);
    await registerWorker(boss, "generate_module", process);
}
async function registerWorker(boss, type, process) {
    const queueName = queueNameForJobType(type);
    await boss.createQueue(queueName);
    await boss.work(queueName, async (jobs) => {
        for (const job of jobs) {
            await process(job.data.agentJobId);
        }
    });
}
