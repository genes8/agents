import { eq, desc } from "drizzle-orm";
import type { Db } from "../client";
import { campaignMessages } from "../schema";
import { newId } from "../id";
import type { CampaignId, CampaignMessage, CampaignModuleId, RunId } from "../../campaign/types";

export async function saveMessage(
  db: Db,
  campaignId: CampaignId,
  input: {
    role: "user" | "assistant" | "system";
    content: string;
    messageType?: "chat" | "refinement" | "system_event";
    moduleId?: CampaignModuleId;
    runId?: RunId;
  },
): Promise<CampaignMessage> {
  const id = newId();
  const now = new Date();
  const messageType = input.messageType ?? "chat";

  await db
    .insert(campaignMessages)
    .values({
      id,
      campaignId,
      role: input.role,
      content: input.content,
      messageType,
      moduleId: input.moduleId,
      runId: input.runId,
      createdAt: now,
    })
    ;

  return {
    id,
    campaignId,
    role: input.role,
    content: input.content,
    messageType,
    moduleId: input.moduleId,
    runId: input.runId,
    createdAt: now,
  };
}

export async function getMessagesByCampaign(
  db: Db,
  campaignId: CampaignId,
  limit = 50,
): Promise<CampaignMessage[]> {
  const rows = await db
    .select()
    .from(campaignMessages)
    .where(eq(campaignMessages.campaignId, campaignId))
    .orderBy(desc(campaignMessages.createdAt))
    .limit(limit);

  return rows
    .reverse()
    .map((r) => ({
      id: r.id,
      campaignId: r.campaignId,
      role: r.role as CampaignMessage["role"],
      content: r.content,
      messageType: r.messageType as CampaignMessage["messageType"],
      moduleId: r.moduleId ?? undefined,
      runId: r.runId ?? undefined,
      createdAt: r.createdAt,
    }));
}
