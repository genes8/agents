import { desc, eq } from "drizzle-orm";
import type { Db } from "../client";
import { exportEvents } from "../schema";
import type { CampaignId, ExportEvent, UserId } from "../../campaign/types";

function newId(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
}

export async function saveExportEvent(
  db: Db,
  input: { campaignId: CampaignId; userId: UserId; format: string },
): Promise<ExportEvent> {
  const id = newId();
  const createdAt = now();

  db
    .insert(exportEvents)
    .values({
      id,
      campaignId: input.campaignId,
      userId: input.userId,
      format: input.format,
      createdAt,
    })
    .run();

  return {
    id,
    campaignId: input.campaignId,
    userId: input.userId,
    format: input.format,
    createdAt,
  };
}

export async function getExportEventsByCampaign(db: Db, campaignId: CampaignId): Promise<ExportEvent[]> {
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
