import { createAgentJob, setAgentJobBossJobId } from "./repository";
export function queueNameForJobType(type) {
    return `agent-job:${type}`;
}
export async function enqueueAgentJob(db, boss, input) {
    const job = await createAgentJob(db, input);
    const queueName = queueNameForJobType(input.type);
    await boss.createQueue(queueName);
    const bossJobId = await boss.send(queueName, { agentJobId: job.id });
    if (bossJobId) {
        await setAgentJobBossJobId(db, job.id, bossJobId);
        return { ...job, bossJobId };
    }
    return job;
}
