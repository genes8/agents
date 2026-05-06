import { buildModulePrompt, buildRefinePrompt } from "../campaign/prompts";
import { CampaignModuleOutputSchema, RefineOutputSchema } from "../campaign/schemas";
import { completeStructuredPrompt } from "../llm/client";
export async function runSocialCopywriter(input) {
    return completeStructuredPrompt(CampaignModuleOutputSchema, {
        prompt: buildModulePrompt(input),
        systemPrompt: "You are a platform-native social copywriting subagent for X, LinkedIn, and Instagram.",
    });
}
export async function runCopyRefiner(input) {
    return completeStructuredPrompt(RefineOutputSchema, {
        prompt: buildRefinePrompt(input),
        systemPrompt: "You refine campaign copy while preserving strategy and brand voice.",
    });
}
