import type { Db } from "../db/client";
import { auditLogs } from "../db/schema";
import type { AuditEventInput } from "./events";

export async function writeAuditEvent(db: Db, input: AuditEventInput): Promise<void> {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    event: input.event,
    userId: input.userId ?? null,
    campaignId: input.campaignId ?? null,
    jobId: input.jobId ?? null,
    runId: input.runId ?? null,
    meta: input.meta ?? null,
    createdAt: new Date(),
  });
}
