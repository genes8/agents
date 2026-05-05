import { createServerFn } from "@tanstack/react-start";
import type { CampaignBrief } from "../lib/campaign/types";
import {
  createCampaignHandler,
  getCampaignHandler,
  listCampaignsHandler,
} from "../lib/workflow/campaign-orchestrator";
import { getCurrentUserId } from "../lib/auth/user";

export const createCampaignFn = createServerFn({ method: "POST" })
  .inputValidator((input: CampaignBrief) => input)
  .handler(async ({ data }) => createCampaignHandler(data, getCurrentUserId()));

export const getCampaignFn = createServerFn({ method: "GET" })
  .inputValidator((input: { campaignId: string }) => input)
  .handler(async ({ data }) => getCampaignHandler(data.campaignId, getCurrentUserId()));

export const listCampaignsFn = createServerFn({ method: "GET" }).handler(async () =>
  listCampaignsHandler(getCurrentUserId()),
);
