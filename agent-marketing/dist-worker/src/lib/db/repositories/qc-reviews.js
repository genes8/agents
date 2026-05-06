import { eq, desc } from "drizzle-orm";
import { qcReviews } from "../schema";
function newId() {
    return crypto.randomUUID();
}
export async function saveQcReview(db, campaignId, result, opts = {}) {
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
    });
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
export async function getQcReviewsByCampaign(db, campaignId) {
    const rows = await db
        .select()
        .from(qcReviews)
        .where(eq(qcReviews.campaignId, campaignId))
        .orderBy(desc(qcReviews.createdAt));
    return rows.map(rowToReview);
}
export async function getQcReviewsByModule(db, moduleId) {
    const rows = await db
        .select()
        .from(qcReviews)
        .where(eq(qcReviews.moduleId, moduleId))
        .orderBy(desc(qcReviews.createdAt));
    return rows.map(rowToReview);
}
function rowToReview(row) {
    const issues = row.issuesJson;
    const suggestedEdits = row.suggestedEditsJson;
    const linkedSourceIds = row.linkedSourceIdsJson;
    return {
        id: row.id,
        campaignId: row.campaignId,
        moduleId: row.moduleId ?? undefined,
        runId: row.runId ?? undefined,
        reviewer: row.reviewer,
        verdict: row.verdict,
        issues,
        suggestedEdits: suggestedEdits ?? undefined,
        confidence: row.confidence ?? undefined,
        linkedSourceIds: linkedSourceIds ?? undefined,
        createdAt: row.createdAt,
    };
}
