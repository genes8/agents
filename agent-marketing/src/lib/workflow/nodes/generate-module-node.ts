import { generateCampaignModule } from "../../agents/orchestrator";
import type { CampaignBrief, CampaignId, CampaignModule, CampaignModuleOutput, CampaignStrategy, CampaignWorkflowState, PersistedCampaignModule, RunId } from "../../campaign/types";
import type { Db } from "../../db/client";
import type { AgentJobProgress } from "../../jobs/types";
import { getSourcesByCampaign } from "../../db/repositories/sources";
import { upsertModule } from "../../db/repositories/campaigns";
import { executeQcReviewNode } from "./run-qc-node";

export async function executeGenerateModuleNode(
  db: Db,
  input: {
    campaignId: CampaignId;
    brief: CampaignBrief;
    strategy: CampaignStrategy;
    module: CampaignModule;
    runId: RunId;
    previousWorkflowState: CampaignWorkflowState;
  },
  onProgress: (p: AgentJobProgress) => Promise<void> = async () => {},
): Promise<{
  output: CampaignModuleOutput;
  persistedModule: PersistedCampaignModule;
  workflowState: CampaignWorkflowState;
}> {
  await onProgress({ step: "generating_module", message: `Writing your ${input.module} content...` });
  const output = await generateCampaignModule({
    brief: input.brief,
    strategy: input.strategy,
    module: input.module,
  });

  await onProgress({ step: "quality_check", message: "Running quality checks..." });
  const persistedModule = await upsertModule(db, input.campaignId, input.module, output);
  const sources = await getSourcesByCampaign(db, input.campaignId);
  const workflowState = await executeQcReviewNode(db, {
    campaignId: input.campaignId,
    moduleId: persistedModule.id,
    runId: input.runId,
    brief: input.brief,
    moduleOutput: output,
    sources,
    previousWorkflowState: input.previousWorkflowState,
  });

  await onProgress({ step: "saving", message: "Saving module..." });
  return { output, persistedModule, workflowState };
}
