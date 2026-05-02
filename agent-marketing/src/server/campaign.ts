import { createServerFn } from "@tanstack/react-start";
import { checkLlmConfiguration } from "../lib/llm/client";
import { generateCampaignModule, generateCampaignStrategy, refineCampaignOutput } from "../lib/agents/orchestrator";
import type {
  CampaignBrief,
  CampaignModule,
  CampaignStrategy,
  RefineOutput,
} from "../lib/campaign/types";

type GenerateModuleInput = {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  module: CampaignModule;
  instructions?: string;
};

type RefineInput = {
  strategy: CampaignStrategy;
  originalText: string;
  instruction: string;
};

export const generateStrategy = createServerFn({ method: "POST" })
  .inputValidator((input: CampaignBrief) => input)
  .handler(async ({ data }) => generateCampaignStrategy(data));

export const generateModule = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateModuleInput) => input)
  .handler(async ({ data }) => generateCampaignModule(data));

export const refineOutput = createServerFn({ method: "POST" })
  .inputValidator((input: RefineInput) => input)
  .handler(async ({ data }) => refineCampaignOutput(data));

export const checkModelConfiguration = createServerFn({ method: "GET" }).handler(async () => checkLlmConfiguration());
