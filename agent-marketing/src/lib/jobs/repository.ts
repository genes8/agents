import { desc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { agentJobs } from "../db/schema";
import { newId, now } from "../db/id";
import type { AgentJob, AgentJobError, AgentJobId, AgentJobPayload, AgentJobProgress, AgentJobStatus, AgentJobType } from "./types";
import type { CampaignId, UserId } from "../campaign/types";

export async function createAgentJob(
  db: Db,
  input: {
    campaignId: CampaignId;
    userId: UserId;
    type: AgentJobType;
    payload: AgentJobPayload;
    bossJobId?: string;
  },
): Promise<AgentJob> {
  const id = newId();
  const createdAt = now();
  const progress: AgentJobProgress = { step: "queued" };

  await db.insert(agentJobs).values({
    id,
    campaignId: input.campaignId,
    userId: input.userId,
    type: input.type,
    status: "queued",
    payloadJson: input.payload,
    progressJson: progress,
    bossJobId: input.bossJobId ?? null,
    attempts: 0,
    createdAt,
  });

  return {
    id,
    campaignId: input.campaignId,
    userId: input.userId,
    type: input.type,
    status: "queued",
    payload: input.payload,
    progress,
    bossJobId: input.bossJobId,
    attempts: 0,
    createdAt,
  };
}

export async function getAgentJob(db: Db, jobId: AgentJobId): Promise<AgentJob | null> {
  const row = (await db.select().from(agentJobs).where(eq(agentJobs.id, jobId)).limit(1))[0];
  return row ? rowToJob(row) : null;
}

export async function listAgentJobsByCampaign(db: Db, campaignId: CampaignId): Promise<AgentJob[]> {
  const rows = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.campaignId, campaignId))
    .orderBy(desc(agentJobs.createdAt), desc(agentJobs.id));
  return rows.map(rowToJob);
}

export async function startAgentJob(db: Db, jobId: AgentJobId, progress: AgentJobProgress): Promise<void> {
  await updateAgentJob(db, jobId, "running", progress, { startedAt: now() });
}

export async function succeedAgentJob(db: Db, jobId: AgentJobId, progress: AgentJobProgress): Promise<void> {
  await updateAgentJob(db, jobId, "succeeded", progress, { completedAt: now() });
}

export async function failAgentJob(db: Db, jobId: AgentJobId, error: AgentJobError): Promise<void> {
  await db
    .update(agentJobs)
    .set({
      status: "failed",
      errorJson: error,
      completedAt: now(),
    })
    .where(eq(agentJobs.id, jobId));
}

export async function setAgentJobBossJobId(db: Db, jobId: AgentJobId, bossJobId: string): Promise<void> {
  await db
    .update(agentJobs)
    .set({ bossJobId })
    .where(eq(agentJobs.id, jobId));
}

export async function cancelAgentJob(db: Db, jobId: AgentJobId): Promise<AgentJob | null> {
  const job = await getAgentJob(db, jobId);
  if (!job) return null;
  if (job.status !== "queued" && job.status !== "running") return job;

  await db
    .update(agentJobs)
    .set({ status: "cancelled", completedAt: now() })
    .where(eq(agentJobs.id, jobId));

  return { ...job, status: "cancelled" };
}

export async function updateJobProgress(db: Db, jobId: AgentJobId, progress: AgentJobProgress): Promise<void> {
  await db
    .update(agentJobs)
    .set({ progressJson: progress })
    .where(eq(agentJobs.id, jobId));
}

export async function listAllAgentJobsByUser(db: Db, userId: UserId, limit = 100): Promise<AgentJob[]> {
  const rows = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.userId, userId))
    .orderBy(desc(agentJobs.createdAt))
    .limit(limit);
  return rows.map(rowToJob);
}

async function updateAgentJob(
  db: Db,
  jobId: AgentJobId,
  status: AgentJobStatus,
  progress: AgentJobProgress,
  timestamps: { startedAt?: Date; completedAt?: Date },
): Promise<void> {
  await db
    .update(agentJobs)
    .set({
      status,
      progressJson: progress,
      attempts: status === "running" ? sql`${agentJobs.attempts} + 1` : undefined,
      startedAt: timestamps.startedAt,
      completedAt: timestamps.completedAt,
    })
    .where(eq(agentJobs.id, jobId));
}

type AgentJobRow = typeof agentJobs.$inferSelect;

function rowToJob(row: AgentJobRow): AgentJob {
  return {
    id: row.id,
    campaignId: row.campaignId,
    userId: row.userId,
    type: row.type as AgentJobType,
    status: row.status as AgentJobStatus,
    payload: row.payloadJson as AgentJobPayload,
    progress: (row.progressJson as AgentJobProgress | null) ?? { step: row.status },
    error: (row.errorJson as AgentJobError | null) ?? undefined,
    bossJobId: row.bossJobId ?? undefined,
    attempts: row.attempts,
    createdAt: row.createdAt,
    startedAt: row.startedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
  };
}
