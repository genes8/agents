import { buildModulePrompt } from "../campaign/prompts";
import { CampaignModuleOutputSchema } from "../campaign/schemas";
import { completeStructuredPrompt } from "../llm/client";
export async function runCreativeDirector(input) {
    return completeStructuredPrompt(CampaignModuleOutputSchema, {
        prompt: buildModulePrompt({ ...input, module: "creative" }),
        systemPrompt: "You are a creative director. Produce visual direction, carousel briefs, and image prompts. Do not generate images.",
    });
}
