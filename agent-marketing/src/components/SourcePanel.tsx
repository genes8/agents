import { useEffect, useState } from "react";
import { getSourcesByCampaignFn } from "../server/runs";
import type { McpSource } from "../lib/campaign/types";

type SourcePanelProps = {
  campaignId: string | null;
  refreshToken?: number;
};

export function SourcePanel({ campaignId, refreshToken }: SourcePanelProps) {
  const [sources, setSources] = useState<McpSource[]>([]);

  useEffect(() => {
    if (!campaignId) {
      setSources([]);
      return;
    }
    getSourcesByCampaignFn({ data: { campaignId } })
      .then((rows) => setSources(rows as McpSource[]))
      .catch(() => null);
  }, [campaignId, refreshToken]);

  if (!campaignId || sources.length === 0) return null;

  return (
    <section className="card">
      <div className="card-hd">
        <p className="step-tag">Research</p>
        <h2>Sources</h2>
        <p>{sources.length} source{sources.length !== 1 ? "s" : ""} used in this campaign.</p>
      </div>
      <ul className="source-list">
        {sources.map((s) => (
          <li className="source-item" key={s.id}>
            <div className="source-meta">
              <span className="source-tool">{s.serverName}.{s.toolName}</span>
              {s.confidence != null && (
                <span className="source-confidence">{Math.round(s.confidence * 100)}%</span>
              )}
            </div>
            {s.title && <p className="source-title">{s.title}</p>}
            {s.snippet && <p className="source-snippet">{s.snippet}</p>}
            {s.sourceUrl && (
              <a className="source-url" href={s.sourceUrl} rel="noopener noreferrer" target="_blank">
                {s.sourceUrl}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
