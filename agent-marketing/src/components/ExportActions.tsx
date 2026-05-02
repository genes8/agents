import { exportCampaignAsJson, exportCampaignAsMarkdown } from "../lib/campaign/export";
import type { CampaignWorkspace } from "../lib/campaign/types";

type ExportActionsProps = {
  workspace: CampaignWorkspace | null;
};

export function ExportActions({ workspace }: ExportActionsProps) {
  const disabled = !workspace;

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
            onClick={() => download("campaign.md", exportCampaignAsMarkdown(workspace!))}
            type="button"
          >
            Download Markdown
          </button>
          <button
            className="export-btn"
            disabled={disabled}
            onClick={() => download("campaign.json", exportCampaignAsJson(workspace!))}
            type="button"
          >
            Download JSON
          </button>
        </div>
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
