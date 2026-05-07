import type { CampaignBrief, CampaignModule, CampaignModuleOutput, CampaignStrategy, RefineOutput } from "../campaign/types";
import { formatMcpToolResults, runMcpResearchTools, type McpToolResult } from "../mcp/runtime";
import { runCreativeDirector } from "./creative-director";
import { runMarketResearcher } from "./market-researcher";
import { runPositioningStrategist } from "./positioning-strategist";
import { runCopyRefiner, runSocialCopywriter } from "./social-copywriter";
import type { CampaignAgents } from "./types";
import type { AgentJobProgress } from "../jobs/types";
import { logger } from "../logging/logger";

const defaultAgents: CampaignAgents = {
  research: runMarketResearcher,
  strategy: runPositioningStrategist,
  module: async (input) => (input.module === "creative" ? runCreativeDirector(input) : runSocialCopywriter(input)),
  refine: runCopyRefiner,
};

export type StrategyResult = {
  strategy: CampaignStrategy;
  mcpResults: McpToolResult[];
};

export async function generateCampaignStrategy(
  brief: CampaignBrief,
  onProgress: (p: AgentJobProgress) => Promise<void> = async () => {},
  agents = defaultAgents,
): Promise<StrategyResult> {
  const briefText = buildBriefText(brief);
  logger.info("orchestrator.mcp_start", { startup: brief.startupName });

  await onProgress({ step: "mcp_connect", message: "Connecting to research tools..." });
  const mcpResults = await runMcpResearchTools({ briefText });
  const mcpContext = formatMcpToolResults(mcpResults);

  await onProgress({ step: "market_research", message: "Analyzing market and competitors..." });
  logger.info("orchestrator.research_start");
  const research = await agents.research({ brief, mcpContext });
  logger.info("orchestrator.research_done");

  await onProgress({ step: "strategy_generation", message: "Crafting your positioning strategy..." });
  logger.info("orchestrator.strategy_start");
  const strategy = await agents.strategy({ brief, mcpContext, research });
  logger.info("orchestrator.strategy_done");

  return { strategy, mcpResults };
}

export async function generateCampaignModule(input: {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  module: CampaignModule;
  instructions?: string;
}, agents = defaultAgents): Promise<CampaignModuleOutput> {
  return agents.module(input);
}

export async function refineCampaignOutput(input: {
  strategy: CampaignStrategy;
  originalText: string;
  instruction: string;
}, agents = defaultAgents): Promise<RefineOutput> {
  return agents.refine(input);
}

function buildBriefText(brief: CampaignBrief): string {
  return [
    brief.startupName,
    brief.productDescription,
    brief.targetAudience,
    brief.problemSolved,
    brief.landingPageUrl ?? "",
    brief.competitors.join(", "),
    brief.extraContext ?? "",
  ].filter(Boolean).join("\n");
}
