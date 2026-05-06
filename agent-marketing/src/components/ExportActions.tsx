import { useEffect, useState } from "react";
import { exportCampaignAsJson, exportCampaignAsMarkdown } from "../lib/campaign/export";
import { getExportEventsFn, recordExportFn } from "../server/runs";
import type { CampaignWorkflowState, CampaignWorkspace, ExportEvent } from "../lib/campaign/types";

type ExportActionsProps = {
  workspace: CampaignWorkspace | null;
  campaignId?: string | null;
  workflowState?: CampaignWorkflowState | null;
  onExported?: (workflowState: CampaignWorkflowState) => void;
  refreshToken?: number;
};

export function ExportActions({ workspace, campaignId, workflowState, onExported, refreshToken }: ExportActionsProps) {
  const [events, setEvents] = useState<ExportEvent[]>([]);
  const disabled = !workspace || (workflowState !== "approved" && workflowState !== "exported");

  useEffect(() => {
    if (!campaignId) {
      setEvents([]);
      return;
    }

    getExportEventsFn({ data: { campaignId } })
      .then((rows) => setEvents(rows))
      .catch(() => setEvents([]));
  }, [campaignId, refreshToken]);

  async function handleExport(format: "markdown" | "json") {
    if (!workspace) return;
    const content = format === "markdown" ? exportCampaignAsMarkdown(workspace) : exportCampaignAsJson(workspace);
    download(`campaign.${format === "markdown" ? "md" : "json"}`, content);
    if (campaignId) {
      const updated = await recordExportFn({ data: { campaignId, format } });
      onExported?.(updated.workflowState);
      const rows = await getExportEventsFn({ data: { campaignId } });
      setEvents(rows);
    }
  }

  return (
    <section className="card">
      <div className="card-hd">
        <p className="step-tag">Step 4</p>
        <h2>Export</h2>
        <p>Download your full campaign as Markdown or JSON.</p>
      </div>
      <div className="card-bd">
        <div className="export-grid">
          <button
            className="export-btn"
            disabled={disabled}
            onClick={() => void handleExport("markdown")}
            type="button"
          >
            Download Markdown
          </button>
          <button
            className="export-btn"
            disabled={disabled}
            onClick={() => void handleExport("json")}
            type="button"
          >
            Download JSON
          </button>
        </div>
        {events.length > 0 && (
          <div className="export-history">
            <h3>Export history</h3>
            <ul>
              {events.map((event) => {
                const createdAt = new Date(event.createdAt);
                return (
                  <li key={event.id}>
                    <span>{event.format}</span>
                    <time dateTime={createdAt.toISOString()}>{createdAt.toLocaleString()}</time>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
