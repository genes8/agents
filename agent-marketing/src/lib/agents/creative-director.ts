import { buildModulePrompt } from "../campaign/prompts";
import { CampaignModuleOutputSchema } from "../campaign/schemas";
import type { CampaignModuleOutput } from "../campaign/types";
import { completeStructuredPrompt } from "../llm/client";
import type { ModuleAgentInput } from "./types";

export async function runCreativeDirector(input: ModuleAgentInput): Promise<CampaignModuleOutput> {
  return completeStructuredPrompt(CampaignModuleOutputSchema, {
    prompt: buildModulePrompt({ ...input, module: "creative" }),
    systemPrompt: "You are a creative director. Produce visual direction, carousel briefs, and image prompts. Do not generate images.",
  });
}
