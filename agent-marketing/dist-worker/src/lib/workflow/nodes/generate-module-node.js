import { generateCampaignModule } from "../../agents/orchestrator";
import { getSourcesByCampaign } from "../../db/repositories/sources";
import { upsertModule } from "../../db/repositories/campaigns";
import { executeQcReviewNode } from "./run-qc-node";
export async function executeGenerateModuleNode(db, input) {
    const output = await generateCampaignModule({
        brief: input.brief,
        strategy: input.strategy,
        module: input.module,
    });
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
    return { output, persistedModule, workflowState };
}
