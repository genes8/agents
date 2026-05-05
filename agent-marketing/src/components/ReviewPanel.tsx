import { useEffect, useState } from "react";
import { approveQcByCampaignId, rejectQcByCampaignId, getQcReviewsByCampaignId } from "../server/modules";
import type { CampaignWorkflowState, PersistedQcReview } from "../lib/campaign/types";

type ReviewPanelProps = {
  campaignId: string | null;
  workflowState: CampaignWorkflowState | null;
  disabled: boolean;
  onStateChange: () => void;
};

const VERDICT_LABEL: Record<string, string> = {
  pass: "Pass",
  warn: "Warning",
  fail: "Fail",
};

const REVIEWER_LABEL: Record<string, string> = {
  brand_safety: "Brand Safety",
  claim_verifier: "Claim Verifier",
  platform_compliance: "Platform Compliance",
  tone_consistency: "Tone Consistency",
  conversion: "Conversion",
};

export function ReviewPanel({ campaignId, workflowState, disabled, onStateChange }: ReviewPanelProps) {
  const [reviews, setReviews] = useState<PersistedQcReview[]>([]);
  const [busy, setBusy] = useState(false);

  const isReviewPending = workflowState === "review_pending";
  const isApproved = workflowState === "approved";
  const isExported = workflowState === "exported";

  useEffect(() => {
    if (!campaignId || (!isReviewPending && !isApproved && !isExported)) {
      setReviews([]);
      return;
    }
    getQcReviewsByCampaignId({ data: { campaignId } })
      .then((rows) => setReviews(rows as PersistedQcReview[]))
      .catch(() => null);
  }, [campaignId, workflowState]);

  if (!campaignId || reviews.length === 0) return null;

  async function handleApprove() {
    if (!campaignId) return;
    setBusy(true);
    try {
      await approveQcByCampaignId({ data: { campaignId } });
      onStateChange();
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!campaignId) return;
    setBusy(true);
    try {
      await rejectQcByCampaignId({ data: { campaignId } });
      onStateChange();
    } finally {
      setBusy(false);
    }
  }

  const hasFail = reviews.some((r) => r.verdict === "fail");
  const hasWarn = reviews.some((r) => r.verdict === "warn");
  const overallVerdict = hasFail ? "fail" : hasWarn ? "warn" : "pass";

  return (
    <section className="card">
      <div className="card-hd">
        <p className="step-tag">Step 3 · QC Review</p>
        <h2>Quality Review</h2>
        <p>
          {isExported
            ? "Campaign exported. QC review archived below."
            : isApproved
              ? "Campaign approved and ready to export."
              : "Review automated QC results before approving this campaign."}
        </p>
      </div>
      <div className="card-bd">
        <div className={`qc-verdict qc-verdict--${overallVerdict}`}>
          {overallVerdict === "pass" && "All checks passed"}
          {overallVerdict === "warn" && "Warnings require attention"}
          {overallVerdict === "fail" && "Critical issues found"}
        </div>
        <div className="output-stack">
          {reviews.map((r) => (
            <div className="output-card" key={r.id}>
              <h3>{REVIEWER_LABEL[r.reviewer] ?? r.reviewer}</h3>
              <span className={`qc-badge qc-badge--${r.verdict}`}>{VERDICT_LABEL[r.verdict]}</span>
              {r.issues.length > 0 && (
                <>
                  <h4>Issues</h4>
                  <ul>
                    {r.issues.map((issue, i) => (
                      <li key={i}>[{issue.severity}] {issue.message}</li>
                    ))}
                  </ul>
                </>
              )}
              {r.suggestedEdits && r.suggestedEdits.length > 0 && (
                <>
                  <h4>Suggested Edits</h4>
                  <ul>
                    {r.suggestedEdits.map((edit, i) => (
                      <li key={i}>{edit}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
        {isReviewPending && (
          <div className="export-grid" style={{ marginTop: "14px" }}>
            <button
              className="export-btn"
              disabled={disabled || busy}
              onClick={() => void handleApprove()}
              type="button"
            >
              Approve
            </button>
            <button
              className="export-btn"
              disabled={disabled || busy}
              onClick={() => void handleReject()}
              type="button"
            >
              Request Revisions
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
