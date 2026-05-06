import { generateModuleHandler, generateStrategyHandler } from "../workflow/campaign-orchestrator";
import { failAgentJob, getAgentJob, startAgentJob, succeedAgentJob } from "./repository";
const defaultRunner = {
    generateStrategy: generateStrategyHandler,
    generateModule: generateModuleHandler,
};
export async function processAgentJob(db, jobId, runner = defaultRunner) {
    const job = await getAgentJob(db, jobId);
    if (!job) {
        throw new Error(`Agent job not found: ${jobId}`);
    }
    await startAgentJob(db, job.id, { step: "running" });
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
        await succeedAgentJob(db, job.id, { step: "completed" });
    }
    catch (error) {
        await failAgentJob(db, job.id, {
            message: error instanceof Error ? error.message : "Unknown job processing error",
            type: "job_processing_error",
        });
    }
}
async function runWithRetry(fn) {
    try {
        return await fn();
    }
    catch (error) {
        if (!isTransientJobError(error)) {
            throw error;
        }
        return fn();
    }
}
function isTransientJobError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return /server_is_overloaded|service_unavailable_error|timeout/i.test(message);
}
