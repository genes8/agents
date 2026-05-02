import { buildStrategyPrompt } from "../campaign/prompts";
import { CampaignStrategySchema } from "../campaign/schemas";
import type { CampaignStrategy } from "../campaign/types";
import { completeStructuredPrompt } from "../llm/client";
import type { StrategyAgentInput } from "./types";

export async function runPositioningStrategist(input: StrategyAgentInput): Promise<CampaignStrategy> {
  const prompt = [
    buildStrategyPrompt(input.brief),
    "Research brief:",
    JSON.stringify(input.research, null, 2),
    "MCP context:",
    input.mcpContext,
  ].join("\n\n");

  return completeStructuredPrompt(CampaignStrategySchema, {
    prompt,
    systemPrompt: "You are a positioning strategist for founder-led startup campaigns.",
  });
}
