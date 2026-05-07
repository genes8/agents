import { generateCampaignStrategy } from "../../agents/orchestrator";
import type { CampaignBrief, CampaignId, CampaignStrategy, McpSource, RunId } from "../../campaign/types";
import type { Db } from "../../db/client";
import type { AgentJobProgress } from "../../jobs/types";
import { saveStrategy } from "../../db/repositories/campaigns";
import { saveSource } from "../../db/repositories/sources";
import { logger } from "../../logging/logger";

export async function executeGenerateStrategyNode(
  db: Db,
  input: { campaignId: CampaignId; brief: CampaignBrief; runId: RunId },
  onProgress: (p: AgentJobProgress) => Promise<void> = async () => {},
): Promise<{ strategy: CampaignStrategy; sources: McpSource[] }> {
  await onProgress({ step: "mcp_research", message: "Searching the web for market data..." });
  logger.info("strategy.mcp_research_start", { campaignId: input.campaignId });

  const { strategy, mcpResults } = await generateCampaignStrategy(input.brief, async (p) => onProgress(p));
  logger.info("strategy.mcp_research_done", { campaignId: input.campaignId, mcpResultCount: mcpResults.length });

  const sources: McpSource[] = [];

  for (const result of mcpResults) {
    if (!result.extractedText) continue;

    sources.push(
      await saveSource(db, {
        campaignId: input.campaignId,
        runId: input.runId,
        sourceUrl: result.sourceUrl,
        title: result.title,
        snippet: (result.snippet ?? result.extractedText).slice(0, 500),
        confidence: result.confidence,
        serverName: result.serverName,
        toolName: result.toolName,
        usedIn: ["market_researcher"],
      }),
    );
  }

  await onProgress({ step: "saving", message: "Saving your strategy..." });
  logger.info("strategy.saving", { campaignId: input.campaignId, sourceCount: sources.length });
  await saveStrategy(db, input.campaignId, strategy);
  logger.info("strategy.saved", { campaignId: input.campaignId });
  return { strategy, sources };
}
