import type { z } from "zod";
import type { CampaignBrief, CampaignModule, CampaignModuleOutput, CampaignStrategy, RefineOutput } from "../campaign/types";
import type { ResearchBriefSchema } from "./schemas";

export type ResearchBrief = z.infer<typeof ResearchBriefSchema>;

export type AgentContext = {
  brief: CampaignBrief;
  mcpContext: string;
};

export type StrategyAgentInput = AgentContext & {
  research: ResearchBrief;
};

export type ModuleAgentInput = {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  module: CampaignModule;
  instructions?: string;
};

export type RefineAgentInput = {
  strategy: CampaignStrategy;
  originalText: string;
  instruction: string;
};

export type CampaignAgents = {
  research: (context: AgentContext) => Promise<ResearchBrief>;
  strategy: (input: StrategyAgentInput) => Promise<CampaignStrategy>;
  module: (input: ModuleAgentInput) => Promise<CampaignModuleOutput>;
  refine: (input: RefineAgentInput) => Promise<RefineOutput>;
};
