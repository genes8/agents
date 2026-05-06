import type { Db } from "../db/client";
import { createAgentJob, setAgentJobBossJobId } from "./repository";
import type { AgentJob, AgentJobPayload, AgentJobType } from "./types";
import type { CampaignId, UserId } from "../campaign/types";

export type BossQueueClient = {
  createQueue: (name: string) => Promise<void>;
  send: (name: string, data: object) => Promise<string | null>;
};

export function queueNameForJobType(type: AgentJobType): string {
  return `agent-job-${type}`;
}

export async function enqueueAgentJob(
  db: Db,
  boss: BossQueueClient,
  input: {
    campaignId: CampaignId;
    userId: UserId;
    type: AgentJobType;
    payload: AgentJobPayload;
  },
): Promise<AgentJob> {
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
