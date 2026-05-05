import { useEffect, useState } from "react";
import { listCampaignsFn } from "../server/campaigns";
import type { CampaignWorkflowState } from "../lib/campaign/types";

type CampaignSummary = {
  id: string;
  name: string;
  workflowState: CampaignWorkflowState;
  updatedAt: Date;
};

type CampaignHistoryProps = {
  activeCampaignId: string | null;
  onSelect: (id: string) => void;
  refreshToken?: number;
};

export function CampaignHistory({ activeCampaignId, onSelect, refreshToken }: CampaignHistoryProps) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);

  useEffect(() => {
    listCampaignsFn().then((rows) => setCampaigns(rows as CampaignSummary[])).catch(() => null);
  }, [refreshToken]);

  if (campaigns.length === 0) {
    return (
      <section className="card muted-card">
        <div className="card-bd">
          <p className="history-empty">No campaigns yet. Fill the brief above and build your first strategy.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-hd">
        <p className="step-tag">History</p>
        <h2>Campaigns</h2>
      </div>
      <ul className="history-list">
        {campaigns.map((c) => (
          <li
            className={`history-item${activeCampaignId === c.id ? " history-item--active" : ""}`}
            key={c.id}
            onClick={() => onSelect(c.id)}
          >
            <span className="history-item-name">{c.name}</span>
            <span className="history-item-state">{c.workflowState.replace(/_/g, " ")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
