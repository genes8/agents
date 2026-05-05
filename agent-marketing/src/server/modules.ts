import { createServerFn } from "@tanstack/react-start";
import type { CampaignId, CampaignModule, CampaignModuleId } from "../lib/campaign/types";
import {
  generateStrategyHandler,
  generateModuleHandler,
  refineModuleHandler,
  approveQcHandler,
  rejectQcHandler,
  getQcReviewsHandler,
} from "../lib/workflow/campaign-orchestrator";
import { getCurrentUserId } from "../lib/auth/user";
import { checkRateLimit } from "../lib/hooks/rate-limit";

type GenerateStrategyInput = { campaignId: CampaignId };
type GenerateModuleInput = { campaignId: CampaignId; module: CampaignModule };
type RefineModuleInput = { campaignId: CampaignId; moduleId: CampaignModuleId; instruction: string };
type CampaignIdInput = { campaignId: CampaignId };

export const generateStrategyByCampaignId = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateStrategyInput) => input)
  .handler(async ({ data }) => {
    const userId = getCurrentUserId();
    await checkRateLimit({ userId, action: "generate_strategy" });
    return generateStrategyHandler(data.campaignId, userId);
  });

export const generateModuleByCampaignId = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateModuleInput) => input)
  .handler(async ({ data }) => {
    const userId = getCurrentUserId();
    await checkRateLimit({ userId, action: "generate_module" });
    return generateModuleHandler(data.campaignId, data.module, userId);
  });

export const refineModuleById = createServerFn({ method: "POST" })
  .inputValidator((input: RefineModuleInput) => input)
  .handler(async ({ data }) => refineModuleHandler(data.campaignId, data.moduleId, data.instruction, getCurrentUserId()));

export const approveQcByCampaignId = createServerFn({ method: "POST" })
  .inputValidator((input: CampaignIdInput) => input)
  .handler(async ({ data }) => approveQcHandler(data.campaignId, getCurrentUserId()));

export const rejectQcByCampaignId = createServerFn({ method: "POST" })
  .inputValidator((input: CampaignIdInput) => input)
  .handler(async ({ data }) => rejectQcHandler(data.campaignId, getCurrentUserId()));

export const getQcReviewsByCampaignId = createServerFn({ method: "GET" })
  .inputValidator((input: CampaignIdInput) => input)
  .handler(async ({ data }) => getQcReviewsHandler(data.campaignId, getCurrentUserId()));
