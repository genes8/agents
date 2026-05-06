import { desc, eq } from "drizzle-orm";
import { exportEvents } from "../schema";
function newId() {
    return crypto.randomUUID();
}
function now() {
    return new Date();
}
export async function saveExportEvent(db, input) {
    const id = newId();
    const createdAt = now();
    await db
        .insert(exportEvents)
        .values({
        id,
        campaignId: input.campaignId,
        userId: input.userId,
        format: input.format,
        createdAt,
    });
    return {
        id,
        campaignId: input.campaignId,
        userId: input.userId,
        format: input.format,
        createdAt,
    };
}
export async function getExportEventsByCampaign(db, campaignId) {
    const rows = await db
        .select()
        .from(exportEvents)
        .where(eq(exportEvents.campaignId, campaignId))
        .orderBy(desc(exportEvents.createdAt));
    return rows.map((row) => ({
        id: row.id,
        campaignId: row.campaignId,
        userId: row.userId ?? undefined,
        format: row.format,
        createdAt: row.createdAt,
    }));
}
