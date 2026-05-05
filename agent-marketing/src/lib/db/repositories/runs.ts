import { eq, desc } from "drizzle-orm";
import type { Db } from "../client";
import { agentRuns } from "../schema";
import type { CampaignId, CampaignWorkflowState, GenerationRun, RunId } from "../../campaign/types";

function newId(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
}

export async function createRun(
  db: Db,
  input: {
    campaignId: CampaignId;
    nodeName: string;
    model?: string;
    stateBefore?: CampaignWorkflowState;
  },
): Promise<GenerationRun> {
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
    })
    .run();

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

export async function completeRun(
  db: Db,
  runId: RunId,
  result: { stateAfter?: CampaignWorkflowState; latencyMs?: number },
): Promise<void> {
  const ts = now();
  await db
    .update(agentRuns)
    .set({
      status: "success",
      stateAfter: result.stateAfter ?? null,
      latencyMs: result.latencyMs ?? null,
      completedAt: ts,
    })
    .where(eq(agentRuns.id, runId))
    .run();
}

export async function failRun(
  db: Db,
  runId: RunId,
  error: { type: string; message: string; latencyMs?: number },
): Promise<void> {
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
    .where(eq(agentRuns.id, runId))
    .run();
}

export async function getRun(db: Db, runId: RunId): Promise<GenerationRun | null> {
  const row = await db.select().from(agentRuns).where(eq(agentRuns.id, runId)).get();
  if (!row) return null;
  return rowToRun(row);
}

export async function getRunsByCampaign(db: Db, campaignId: CampaignId): Promise<GenerationRun[]> {
  const rows = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.campaignId, campaignId))
    .orderBy(desc(agentRuns.createdAt));
  return rows.map(rowToRun);
}

type RunRow = typeof agentRuns.$inferSelect;

function rowToRun(row: RunRow): GenerationRun {
  return {
    id: row.id,
    campaignId: row.campaignId,
    nodeName: row.nodeName,
    model: row.model ?? undefined,
    status: row.status as GenerationRun["status"],
    stateBefore: (row.stateBefore as CampaignWorkflowState | null) ?? undefined,
    stateAfter: (row.stateAfter as CampaignWorkflowState | null) ?? undefined,
    errorType: row.errorType ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    latencyMs: row.latencyMs ?? undefined,
    createdAt: row.createdAt,
    completedAt: row.completedAt ?? undefined,
  };
}
