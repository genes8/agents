import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BriefForm } from "../components/BriefForm";
import { ExportActions } from "../components/ExportActions";
import { ModuleWorkbench } from "../components/ModuleWorkbench";
import { StrategyPanel } from "../components/StrategyPanel";
import type { CampaignBrief, CampaignModule, CampaignModuleOutput, CampaignStrategy } from "../lib/campaign/types";
import { checkModelConfiguration, generateModule, generateStrategy } from "../server/campaign";

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

function HomePage() {
  const [brief, setBrief] = useState<CampaignBrief>(initialBrief);
  const [strategy, setStrategy] = useState<CampaignStrategy | null>(null);
  const [modules, setModules] = useState<CampaignModuleOutput[]>([]);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [modelInfo, setModelInfo] = useState<string>("");

  const workspace = useMemo(
    () => (strategy ? { brief, strategy, modules } : null),
    [brief, modules, strategy],
  );

  useEffect(() => {
    void checkModelConfiguration()
      .then((r) => setModelInfo(r.message))
      .catch((e) => setModelInfo((e as Error).message));
  }, []);

  async function handleGenerateStrategy() {
    setError("");
    setStatus("Building Strategy Core...");
    try {
      const result = await generateStrategy({ data: brief });
      setStrategy(result);
      setModules([]);
      setStatus("Strategy Core ready.");
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    }
  }

  async function handleGenerateModule(module: CampaignModule) {
    if (!strategy) return;
    setError("");
    setStatus(`Generating ${module} module...`);
    try {
      const result = await generateModule({ data: { brief, strategy, module } });
      setModules((prev) => [...prev, result]);
      setStatus(`${result.title} ready.`);
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    }
  }

  const busy = status.endsWith("...");

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

      <div className="app-grid">
        <BriefForm brief={brief} disabled={busy} onChange={setBrief} onSubmit={handleGenerateStrategy} />
        <div className="workbench-stack">
          <StrategyPanel strategy={strategy} />
          <ModuleWorkbench disabled={busy} modules={modules} onGenerate={handleGenerateModule} strategy={strategy} />
          <ExportActions workspace={workspace} />
        </div>
      </div>
    </main>
  );
}
