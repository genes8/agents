import type { CampaignBrief, CampaignModule, CampaignStrategy } from "./types";

type ModulePromptInput = {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  module: CampaignModule;
  instructions?: string;
};

type RefinePromptInput = {
  strategy: CampaignStrategy;
  originalText: string;
  instruction: string;
};

const CAMPAIGN_STRATEGY_SCHEMA = `{
  "marketSummary": "string — one paragraph overview of the market landscape",
  "icp": "string — ideal customer profile description",
  "painPoints": ["string", "..."],
  "positioningStatement": "string",
  "messagingPillars": [
    {
      "name": "string — pillar name",
      "description": "string — what this pillar communicates",
      "proofPoints": ["string", "..."]
    }
  ],
  "brandVoice": {
    "tone": ["string", "..."],
    "avoid": ["string", "..."]
  },
  "hooks": ["string", "..."],
  "channelStrategy": {
    "x": "string — X/Twitter channel strategy",
    "linkedin": "string — LinkedIn channel strategy",
    "instagram": "string — Instagram channel strategy"
  }
}`;

export function buildStrategyPrompt(brief: CampaignBrief): string {
  return [
    "You are a startup go-to-market campaign strategist.",
    "Use available web/search/MCP tools for research when they exist. If no tools are available, work from the supplied brief and state practical assumptions inside the JSON fields without adding prose outside JSON.",
    "Return only valid JSON matching this exact schema. All nested fields are required. Do not wrap in Markdown.",
    CAMPAIGN_STRATEGY_SCHEMA,
    "Brief:",
    JSON.stringify(brief, null, 2),
  ].join("\n\n");
}

export function buildModulePrompt(input: ModulePromptInput): string {
  return [
    "You are a platform-specific social campaign producer.",
    `Generate the ${input.module} module for this startup campaign.`,
    "Use the Strategy Core as the source of truth. Keep copy specific, non-generic, and suitable for a startup founder.",
    "Return only valid JSON matching CampaignModuleOutput. Do not wrap in Markdown.",
    "CampaignModuleOutput fields: module, title, summary, sections. Each section has title and items.",
    input.instructions ? `Additional user instructions: ${input.instructions}` : "No additional user instructions.",
    "Brief:",
    JSON.stringify(input.brief, null, 2),
    "Strategy Core:",
    JSON.stringify(input.strategy, null, 2),
  ].join("\n\n");
}

export function buildRefinePrompt(input: RefinePromptInput): string {
  return [
    "You are refining one campaign content block while preserving the campaign strategy.",
    "Return only valid JSON matching RefineOutput. Do not wrap in Markdown.",
    "RefineOutput fields: revisedText, changeSummary.",
    `Instruction: ${input.instruction}`,
    "Original text:",
    input.originalText,
    "Strategy Core:",
    JSON.stringify(input.strategy, null, 2),
  ].join("\n\n");
}
