import { desc, eq, sql } from "drizzle-orm";
import { agentJobs } from "../db/schema";
function newId() {
    return crypto.randomUUID();
}
function now() {
    return new Date();
}
export async function createAgentJob(db, input) {
    const id = newId();
    const createdAt = now();
    const progress = { step: "queued" };
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
export async function getAgentJob(db, jobId) {
    const row = (await db.select().from(agentJobs).where(eq(agentJobs.id, jobId)).limit(1))[0];
    return row ? rowToJob(row) : null;
}
export async function listAgentJobsByCampaign(db, campaignId) {
    const rows = await db
        .select()
        .from(agentJobs)
        .where(eq(agentJobs.campaignId, campaignId))
        .orderBy(desc(agentJobs.createdAt), desc(agentJobs.id));
    return rows.map(rowToJob);
}
export async function startAgentJob(db, jobId, progress) {
    await updateAgentJob(db, jobId, "running", progress, { startedAt: now() });
}
export async function succeedAgentJob(db, jobId, progress) {
    await updateAgentJob(db, jobId, "succeeded", progress, { completedAt: now() });
}
export async function failAgentJob(db, jobId, error) {
    await db
        .update(agentJobs)
        .set({
        status: "failed",
        errorJson: error,
        completedAt: now(),
    })
        .where(eq(agentJobs.id, jobId));
}
export async function setAgentJobBossJobId(db, jobId, bossJobId) {
    await db
        .update(agentJobs)
        .set({ bossJobId })
        .where(eq(agentJobs.id, jobId));
}
async function updateAgentJob(db, jobId, status, progress, timestamps) {
    await db
        .update(agentJobs)
        .set({
        status,
        progressJson: progress,
        attempts: status === "running" ? sql `${agentJobs.attempts} + 1` : undefined,
        startedAt: timestamps.startedAt,
        completedAt: timestamps.completedAt,
    })
        .where(eq(agentJobs.id, jobId));
}
function rowToJob(row) {
    return {
        id: row.id,
        campaignId: row.campaignId,
        userId: row.userId,
        type: row.type,
        status: row.status,
        payload: row.payloadJson,
        progress: row.progressJson ?? { step: row.status },
        error: row.errorJson ?? undefined,
        bossJobId: row.bossJobId ?? undefined,
        attempts: row.attempts,
        createdAt: row.createdAt,
        startedAt: row.startedAt ?? undefined,
        completedAt: row.completedAt ?? undefined,
    };
}
