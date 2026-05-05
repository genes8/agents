import { createServerFn } from "@tanstack/react-start";
import {
  getSourcesHandler,
  recordExportHandler,
  chatHandler,
  getMessagesHandler,
  getExportEventsHandler,
} from "../lib/workflow/campaign-orchestrator";
import { getCurrentUserId } from "../lib/auth/user";
import { checkRateLimit } from "../lib/hooks/rate-limit";

export const getSourcesByCampaignFn = createServerFn({ method: "GET" })
  .inputValidator((input: { campaignId: string }) => input)
  .handler(async ({ data }) => getSourcesHandler(data.campaignId, getCurrentUserId()));

export const recordExportFn = createServerFn({ method: "POST" })
  .inputValidator((input: { campaignId: string; format: string }) => input)
  .handler(async ({ data }) => {
    const userId = getCurrentUserId();
    await checkRateLimit({ userId, action: "export" });
    return recordExportHandler(data.campaignId, data.format, userId);
  });

export const chatFn = createServerFn({ method: "POST" })
  .inputValidator((input: { campaignId: string; content: string }) => input)
  .handler(async ({ data }) => {
    const userId = getCurrentUserId();
    await checkRateLimit({ userId, action: "chat" });
    return chatHandler(data.campaignId, data.content, userId);
  });

export const getMessagesFn = createServerFn({ method: "GET" })
  .inputValidator((input: { campaignId: string }) => input)
  .handler(async ({ data }) => getMessagesHandler(data.campaignId, getCurrentUserId()));

export const getExportEventsFn = createServerFn({ method: "GET" })
  .inputValidator((input: { campaignId: string }) => input)
  .handler(async ({ data }) => getExportEventsHandler(data.campaignId, getCurrentUserId()));
