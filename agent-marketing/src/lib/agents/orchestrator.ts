import type { CampaignBrief, CampaignModule, CampaignModuleOutput, CampaignStrategy, RefineOutput } from "../campaign/types";
import { formatMcpToolResults, runMcpResearchTools, type McpToolResult } from "../mcp/runtime";
import { runCreativeDirector } from "./creative-director";
import { runMarketResearcher } from "./market-researcher";
import { runPositioningStrategist } from "./positioning-strategist";
import { runCopyRefiner, runSocialCopywriter } from "./social-copywriter";
import type { CampaignAgents } from "./types";

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
  agents = defaultAgents,
): Promise<StrategyResult> {
  const mcpResults = await runMcpResearchTools({ briefText: buildBriefText(brief) });
  const mcpContext = formatMcpToolResults(mcpResults);
  const research = await agents.research({ brief, mcpContext });
  const strategy = await agents.strategy({ brief, mcpContext, research });
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
