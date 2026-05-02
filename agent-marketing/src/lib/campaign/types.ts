import type { z } from "zod";
import type {
  CampaignGoalSchema,
  CampaignModuleOutputSchema,
  CampaignModuleSchema,
  CampaignStrategySchema,
  RefineOutputSchema,
} from "./schemas";

export type CampaignGoal = z.infer<typeof CampaignGoalSchema>;
export type CampaignModule = z.infer<typeof CampaignModuleSchema>;

export type CampaignBrief = {
  startupName: string;
  productDescription: string;
  targetAudience: string;
  problemSolved: string;
  campaignGoal: CampaignGoal;
  landingPageUrl?: string;
  competitors: string[];
  tone: string[];
  extraContext?: string;
};

export type CampaignStrategy = z.infer<typeof CampaignStrategySchema>;
export type CampaignModuleOutput = z.infer<typeof CampaignModuleOutputSchema>;
export type RefineOutput = z.infer<typeof RefineOutputSchema>;

export type CampaignWorkspace = {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  modules: CampaignModuleOutput[];
};
