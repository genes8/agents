import { eq, desc } from "drizzle-orm";
import { campaignMessages } from "../schema";
function newId() {
    return crypto.randomUUID();
}
export async function saveMessage(db, campaignId, input) {
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
    });
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
export async function getMessagesByCampaign(db, campaignId, limit = 50) {
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
        role: r.role,
        content: r.content,
        messageType: r.messageType,
        moduleId: r.moduleId ?? undefined,
        runId: r.runId ?? undefined,
        createdAt: r.createdAt,
    }));
}
