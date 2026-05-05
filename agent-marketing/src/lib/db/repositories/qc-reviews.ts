import { eq, desc } from "drizzle-orm";
import type { Db } from "../client";
import { qcReviews } from "../schema";
import type { CampaignId, CampaignModuleId, PersistedQcReview, QcReviewIssue, RunId } from "../../campaign/types";
import type { QcReviewResult } from "../../campaign/types";

function newId(): string {
  return crypto.randomUUID();
}

export async function saveQcReview(
  db: Db,
  campaignId: CampaignId,
  result: QcReviewResult,
  opts: { moduleId?: CampaignModuleId; runId?: RunId } = {},
): Promise<PersistedQcReview> {
  const id = newId();
  const now = new Date();

  await db
    .insert(qcReviews)
    .values({
      id,
      campaignId,
      moduleId: opts.moduleId,
      runId: opts.runId,
      reviewer: result.reviewer,
      verdict: result.verdict,
      issuesJson: JSON.stringify(result.issues),
      suggestedEditsJson: result.suggestedEdits ? JSON.stringify(result.suggestedEdits) : null,
      confidence: result.confidence,
      linkedSourceIdsJson: result.linkedSourceIds ? JSON.stringify(result.linkedSourceIds) : null,
      createdAt: now,
    })
    .run();

  return rowToReview({
    id,
    campaignId,
    moduleId: opts.moduleId ?? null,
    runId: opts.runId ?? null,
    reviewer: result.reviewer,
    verdict: result.verdict,
    issuesJson: JSON.stringify(result.issues),
    suggestedEditsJson: result.suggestedEdits ? JSON.stringify(result.suggestedEdits) : null,
    confidence: result.confidence ?? null,
    linkedSourceIdsJson: result.linkedSourceIds ? JSON.stringify(result.linkedSourceIds) : null,
    createdAt: now,
  });
}

export async function getQcReviewsByCampaign(
  db: Db,
  campaignId: CampaignId,
): Promise<PersistedQcReview[]> {
  const rows = await db
    .select()
    .from(qcReviews)
    .where(eq(qcReviews.campaignId, campaignId))
    .orderBy(desc(qcReviews.createdAt));

  return rows.map(rowToReview);
}

export async function getQcReviewsByModule(
  db: Db,
  moduleId: CampaignModuleId,
): Promise<PersistedQcReview[]> {
  const rows = await db
    .select()
    .from(qcReviews)
    .where(eq(qcReviews.moduleId, moduleId))
    .orderBy(desc(qcReviews.createdAt));

  return rows.map(rowToReview);
}

type QcReviewRow = {
  id: string;
  campaignId: string;
  moduleId: string | null;
  runId: string | null;
  reviewer: string;
  verdict: string;
  issuesJson: string;
  suggestedEditsJson: string | null;
  confidence: number | null;
  linkedSourceIdsJson: string | null;
  createdAt: Date;
};

function rowToReview(row: QcReviewRow): PersistedQcReview {
  return {
    id: row.id,
    campaignId: row.campaignId,
    moduleId: row.moduleId ?? undefined,
    runId: row.runId ?? undefined,
    reviewer: row.reviewer as PersistedQcReview["reviewer"],
    verdict: row.verdict as PersistedQcReview["verdict"],
    issues: JSON.parse(row.issuesJson) as QcReviewIssue[],
    suggestedEdits: row.suggestedEditsJson ? (JSON.parse(row.suggestedEditsJson) as string[]) : undefined,
    confidence: row.confidence ?? undefined,
    linkedSourceIds: row.linkedSourceIdsJson ? (JSON.parse(row.linkedSourceIdsJson) as string[]) : undefined,
    createdAt: row.createdAt,
  };
}
