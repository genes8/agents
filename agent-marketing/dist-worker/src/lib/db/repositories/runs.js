import { eq, desc } from "drizzle-orm";
import { agentRuns } from "../schema";
function newId() {
    return crypto.randomUUID();
}
function now() {
    return new Date();
}
export async function createRun(db, input) {
    const id = newId();
    const ts = now();
    await db
        .insert(agentRuns)
        .values({
        id,
        campaignId: input.campaignId,
        nodeName: input.nodeName,
        model: input.model ?? null,
        status: "running",
        stateBefore: input.stateBefore ?? null,
        createdAt: ts,
    });
    return {
        id,
        campaignId: input.campaignId,
        nodeName: input.nodeName,
        model: input.model,
        status: "running",
        stateBefore: input.stateBefore,
        createdAt: ts,
    };
}
export async function completeRun(db, runId, result) {
    const ts = now();
    await db
        .update(agentRuns)
        .set({
        status: "success",
        stateAfter: result.stateAfter ?? null,
        latencyMs: result.latencyMs ?? null,
        completedAt: ts,
    })
        .where(eq(agentRuns.id, runId));
}
export async function failRun(db, runId, error) {
    const ts = now();
    await db
        .update(agentRuns)
        .set({
        status: "failed",
        errorType: error.type,
        errorMessage: error.message,
        latencyMs: error.latencyMs ?? null,
        completedAt: ts,
    })
        .where(eq(agentRuns.id, runId));
}
export async function getRun(db, runId) {
    const row = (await db.select().from(agentRuns).where(eq(agentRuns.id, runId)).limit(1))[0];
    if (!row)
        return null;
    return rowToRun(row);
}
export async function getRunsByCampaign(db, campaignId) {
    const rows = await db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.campaignId, campaignId))
        .orderBy(desc(agentRuns.createdAt));
    return rows.map(rowToRun);
}
function rowToRun(row) {
    return {
        id: row.id,
        campaignId: row.campaignId,
        nodeName: row.nodeName,
        model: row.model ?? undefined,
        status: row.status,
        stateBefore: row.stateBefore ?? undefined,
        stateAfter: row.stateAfter ?? undefined,
        errorType: row.errorType ?? undefined,
        errorMessage: row.errorMessage ?? undefined,
        latencyMs: row.latencyMs ?? undefined,
        createdAt: row.createdAt,
        completedAt: row.completedAt ?? undefined,
    };
}
