import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BriefForm } from "../components/BriefForm";
import { CampaignChat } from "../components/CampaignChat";
import { CampaignHistory } from "../components/CampaignHistory";
import { ExportActions } from "../components/ExportActions";
import { ModuleWorkbench } from "../components/ModuleWorkbench";
import { ReviewPanel } from "../components/ReviewPanel";
import { SourcePanel } from "../components/SourcePanel";
import { StrategyPanel } from "../components/StrategyPanel";
import type { CampaignBrief, CampaignModule, CampaignModuleOutput, CampaignStrategy, CampaignWorkflowState } from "../lib/campaign/types";
import type { AgentJobStatus } from "../lib/jobs/types";
import { checkModelConfiguration } from "../server/campaign";
import { createCampaignFn, getCampaignFn } from "../server/campaigns";
import { generateStrategyByCampaignId, generateModuleByCampaignId } from "../server/modules";
import { getAgentJobByIdFn } from "../server/runs";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const initialBrief: CampaignBrief = {
  startupName: "",
  productDescription: "",
  targetAudience: "",
  problemSolved: "",
  campaignGoal: "awareness",
  landingPageUrl: "",
  competitors: [],
  tone: ["clear", "credible", "founder-led"],
  extraContext: "",
};

type ActiveJob = {
  id: string;
  type: "generate_strategy" | "generate_module";
  module?: CampaignModule;
  status: AgentJobStatus;
};

function HomePage() {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [brief, setBrief] = useState<CampaignBrief>(initialBrief);
  const [strategy, setStrategy] = useState<CampaignStrategy | null>(null);
  const [modules, setModules] = useState<CampaignModuleOutput[]>([]);
  const [generatedKinds, setGeneratedKinds] = useState<Set<CampaignModule>>(new Set());
  const [workflowState, setWorkflowState] = useState<CampaignWorkflowState | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [modelInfo, setModelInfo] = useState<string>("");
  const [historyToken, setHistoryToken] = useState(0);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);

  const workspace = useMemo(
    () => (strategy ? { brief, strategy, modules } : null),
    [brief, modules, strategy],
  );

  useEffect(() => {
    void checkModelConfiguration()
      .then((r) => setModelInfo(r.message))
      .catch((e) => setModelInfo((e as Error).message));
  }, []);

  useEffect(() => {
    if (!activeJob || !campaignId) return;

    const interval = setInterval(() => {
      void getAgentJobByIdFn({ data: { jobId: activeJob.id } })
        .then(async (job) => {
          setActiveJob((current) => (current ? { ...current, status: job.status } : current));

          if (job.status === "queued") {
            setStatus(activeJob.type === "generate_strategy" ? "Strategy job queued..." : "Module job queued...");
            return;
          }

          if (job.status === "running") {
            setStatus(
              activeJob.type === "generate_strategy"
                ? "Building Strategy Core..."
                : `Generating ${activeJob.module} module...`,
            );
            return;
          }

          if (job.status === "failed") {
            setError(job.error?.message ?? "Job failed.");
            setStatus("");
            setActiveJob(null);
            clearInterval(interval);
            return;
          }

          if (job.status === "succeeded") {
            const ws = await getCampaignFn({ data: { campaignId } });
            if (ws) {
              setCampaignId(ws.id);
              setBrief(ws.brief);
              setStrategy(ws.strategy ?? null);
              applyWorkspaceModules(ws.modules);
              setWorkflowState(ws.workflowState);
              setHistoryToken((t) => t + 1);
              if (activeJob.type === "generate_strategy") {
                setStatus("Strategy Core ready.");
              } else {
                const generated = ws.modules.find((m) => m.moduleKind === activeJob.module);
                const stateMsg = ws.workflowState === "review_pending" ? " — QC review required." : " ready.";
                setStatus(`${generated?.output.title ?? activeJob.module}${stateMsg}`);
              }
            }
            setActiveJob(null);
            clearInterval(interval);
          }
        })
        .catch((e) => {
          setError((e as Error).message);
          setStatus("");
          setActiveJob(null);
          clearInterval(interval);
        });
    }, 1200);

    return () => clearInterval(interval);
  }, [activeJob, campaignId]);

  async function handleGenerateStrategy() {
    setError("");
    setStatus("Queueing Strategy Core...");
    try {
      const campaign = campaignId
        ? { id: campaignId }
        : await createCampaignFn({ data: brief });

      const id = campaign.id;
      setCampaignId(id);

      const { jobId } = await generateStrategyByCampaignId({ data: { campaignId: id } });
      setActiveJob({ id: jobId, type: "generate_strategy", status: "queued" });
      setStatus("Strategy job queued...");
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    }
  }

  async function handleGenerateModule(module: CampaignModule) {
    if (!strategy || !campaignId) return;
    setError("");
    setStatus(`Queueing ${module} module...`);
    try {
      const { jobId } = await generateModuleByCampaignId({ data: { campaignId, module } });
      setActiveJob({ id: jobId, type: "generate_module", module, status: "queued" });
      setStatus("Module job queued...");
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    }
  }

  function handleQcStateChange() {
    if (!campaignId) return;
    void getCampaignFn({ data: { campaignId } }).then((ws) => {
      if (!ws) return;
      setWorkflowState(ws.workflowState);
      setStatus(ws.workflowState === "approved" ? "Campaign approved." : "Campaign returned for revisions.");
    });
  }

  function handleExportStateChange(state: CampaignWorkflowState) {
    setWorkflowState(state);
    setHistoryToken((t) => t + 1);
    setStatus(state === "exported" ? "Campaign exported." : "Export recorded.");
  }

  async function handleLoadCampaign(id: string) {
    setError("");
    setStatus("Loading campaign...");
    try {
      const ws = await getCampaignFn({ data: { campaignId: id } });
      if (!ws) {
        setError("Campaign not found.");
        setStatus("");
        return;
      }
      setCampaignId(ws.id);
      setBrief(ws.brief);
      setStrategy(ws.strategy ?? null);
      applyWorkspaceModules(ws.modules);
      setWorkflowState(ws.workflowState);
      setStatus("Campaign loaded.");
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    }
  }

  const busy = Boolean(activeJob) || status.endsWith("...");

  function applyWorkspaceModules(mods: Array<{ moduleKind: CampaignModule; output: CampaignModuleOutput }>) {
    setModules(mods.map((m) => m.output));
    setGeneratedKinds(new Set(mods.map((m) => m.moduleKind)));
  }

  return (
    <main className="page-shell">
      <header className="hero-panel">
        <p className="eyebrow">DeepSeek + MCP GTM Copilot</p>
        <h1>Build the strategy before the content.</h1>
        <p>
          A guided workspace for startup founders — positioning, X posts,
          LinkedIn campaigns, Instagram briefs, content calendars, and image prompts.
        </p>
      </header>

      {modelInfo && <div className="status-banner">{modelInfo}</div>}
      {status && <div className="status-banner">{status}</div>}
      {error && <div className="error-banner">{error}</div>}
      {workflowState && (
        <div className={`state-pill state-pill--${workflowState}`}>
          {workflowState.replace(/_/g, " ")}
        </div>
      )}

      <div className="app-grid">
        <div className="sidebar-stack">
          <BriefForm brief={brief} disabled={busy} onChange={setBrief} onSubmit={handleGenerateStrategy} />
          <CampaignHistory
            activeCampaignId={campaignId}
            onSelect={handleLoadCampaign}
            refreshToken={historyToken}
          />
        </div>
        <div className="workbench-stack">
          <StrategyPanel strategy={strategy} />
          <ModuleWorkbench disabled={busy} generatedKinds={generatedKinds} modules={modules} onGenerate={handleGenerateModule} strategy={strategy} />
          <ReviewPanel
            campaignId={campaignId}
            workflowState={workflowState}
            disabled={busy}
            onStateChange={handleQcStateChange}
          />
          <CampaignChat campaignId={campaignId} refreshToken={historyToken} />
          <SourcePanel campaignId={campaignId} refreshToken={historyToken} />
          <ExportActions
            campaignId={campaignId}
            onExported={handleExportStateChange}
            workflowState={workflowState}
            workspace={workspace}
          />
        </div>
      </div>
    </main>
  );
}
