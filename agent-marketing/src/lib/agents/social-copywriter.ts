import { buildModulePrompt, buildRefinePrompt } from "../campaign/prompts";
import { CampaignModuleOutputSchema, RefineOutputSchema } from "../campaign/schemas";
import type { CampaignModuleOutput, RefineOutput } from "../campaign/types";
import { completeStructuredPrompt } from "../llm/client";
import type { ModuleAgentInput, RefineAgentInput } from "./types";

export async function runSocialCopywriter(input: ModuleAgentInput): Promise<CampaignModuleOutput> {
  return completeStructuredPrompt(CampaignModuleOutputSchema, {
    prompt: buildModulePrompt(input),
    systemPrompt: "You are a platform-native social copywriting subagent for X, LinkedIn, and Instagram.",
  });
}

export async function runCopyRefiner(input: RefineAgentInput): Promise<RefineOutput> {
  return completeStructuredPrompt(RefineOutputSchema, {
    prompt: buildRefinePrompt(input),
    systemPrompt: "You refine campaign copy while preserving strategy and brand voice.",
  });
}
