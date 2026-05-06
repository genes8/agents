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
      issuesJson: result.issues,
      suggestedEditsJson: result.suggestedEdits ?? null,
      confidence: result.confidence,
      linkedSourceIdsJson: result.linkedSourceIds ?? null,
      createdAt: now,
    })
    ;

  return rowToReview({
    id,
    campaignId,
    moduleId: opts.moduleId ?? null,
    runId: opts.runId ?? null,
    reviewer: result.reviewer,
    verdict: result.verdict,
    issuesJson: result.issues,
    suggestedEditsJson: result.suggestedEdits ?? null,
    confidence: result.confidence ?? null,
    linkedSourceIdsJson: result.linkedSourceIds ?? null,
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

type QcReviewRow = typeof qcReviews.$inferSelect;

function rowToReview(row: QcReviewRow): PersistedQcReview {
  const issues = row.issuesJson as QcReviewIssue[];
  const suggestedEdits = row.suggestedEditsJson as string[] | null;
  const linkedSourceIds = row.linkedSourceIdsJson as string[] | null;

  return {
    id: row.id,
    campaignId: row.campaignId,
    moduleId: row.moduleId ?? undefined,
    runId: row.runId ?? undefined,
    reviewer: row.reviewer as PersistedQcReview["reviewer"],
    verdict: row.verdict as PersistedQcReview["verdict"],
    issues,
    suggestedEdits: suggestedEdits ?? undefined,
    confidence: row.confidence ?? undefined,
    linkedSourceIds: linkedSourceIds ?? undefined,
    createdAt: row.createdAt,
  };
}
