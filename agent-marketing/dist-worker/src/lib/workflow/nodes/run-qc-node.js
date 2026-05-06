import { runBrandSafetyReviewer } from "../../agents/qc/brand-safety-reviewer";
import { runClaimVerifier } from "../../agents/qc/claim-verifier";
import { runConversionReviewer } from "../../agents/qc/conversion-reviewer";
import { runPlatformComplianceReviewer } from "../../agents/qc/platform-compliance-reviewer";
import { runToneConsistencyReviewer } from "../../agents/qc/tone-consistency-reviewer";
import { saveQcReview } from "../../db/repositories/qc-reviews";
const qcReviewers = [
    { reviewer: "brand_safety", run: runBrandSafetyReviewer },
    { reviewer: "claim_verifier", run: runClaimVerifier },
    { reviewer: "platform_compliance", run: runPlatformComplianceReviewer },
    { reviewer: "tone_consistency", run: runToneConsistencyReviewer },
    { reviewer: "conversion", run: runConversionReviewer },
];
export async function executeQcReviewNode(db, input) {
    const qcInput = { brief: input.brief, moduleOutput: input.moduleOutput, sources: input.sources };
    const reviewResults = await Promise.allSettled(qcReviewers.map((reviewer) => reviewer.run(qcInput)));
    let needsReview = false;
    for (const [index, result] of reviewResults.entries()) {
        if (result.status === "fulfilled") {
            await saveQcReview(db, input.campaignId, result.value, { moduleId: input.moduleId, runId: input.runId });
            if (result.value.verdict === "warn" || result.value.verdict === "fail")
                needsReview = true;
            continue;
        }
        needsReview = true;
        await saveQcReview(db, input.campaignId, {
            reviewer: qcReviewers[index].reviewer,
            verdict: "fail",
            issues: [
                {
                    severity: "error",
                    message: result.reason instanceof Error ? result.reason.message : "QC reviewer failed to complete.",
                },
            ],
            confidence: 0,
        }, { moduleId: input.moduleId, runId: input.runId });
    }
    if (needsReview) {
        return "review_pending";
    }
    return input.previousWorkflowState === "exported" ? "exported" : "approved";
}
