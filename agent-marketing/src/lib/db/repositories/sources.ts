import { eq, and } from "drizzle-orm";
import type { Db } from "../client";
import { mcpSources } from "../schema";
import type { CampaignId, McpSource, McpSourceId, RunId } from "../../campaign/types";

function newId(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
}

export async function saveSource(
  db: Db,
  input: {
    campaignId: CampaignId;
    runId?: RunId;
    sourceUrl?: string;
    title?: string;
    snippet?: string;
    confidence?: number;
    usedIn?: string[];
    serverName: string;
    toolName: string;
  },
): Promise<McpSource> {
  const id = newId();
  const ts = now();

  await db
    .insert(mcpSources)
    .values({
      id,
      campaignId: input.campaignId,
      runId: input.runId ?? null,
      sourceUrl: input.sourceUrl ?? null,
      title: input.title ?? null,
      snippet: input.snippet ?? null,
      confidence: input.confidence ?? null,
      usedInJson: input.usedIn ?? null,
      serverName: input.serverName,
      toolName: input.toolName,
      createdAt: ts,
    })
    ;

  return {
    id,
    campaignId: input.campaignId,
    runId: input.runId,
    sourceUrl: input.sourceUrl,
    title: input.title,
    snippet: input.snippet,
    confidence: input.confidence,
    usedIn: input.usedIn,
    serverName: input.serverName,
    toolName: input.toolName,
    createdAt: ts,
  };
}

export async function getSourcesByCampaign(db: Db, campaignId: CampaignId): Promise<McpSource[]> {
  const rows = await db
    .select()
    .from(mcpSources)
    .where(eq(mcpSources.campaignId, campaignId))
    .orderBy(mcpSources.createdAt);
  return rows.map(rowToSource);
}

export async function getSourcesByRun(db: Db, runId: RunId): Promise<McpSource[]> {
  const rows = await db
    .select()
    .from(mcpSources)
    .where(eq(mcpSources.runId, runId))
    .orderBy(mcpSources.createdAt);
  return rows.map(rowToSource);
}

export async function getSourceById(db: Db, sourceId: McpSourceId): Promise<McpSource | null> {
  const row = (await db.select().from(mcpSources).where(eq(mcpSources.id, sourceId)).limit(1))[0];
  return row ? rowToSource(row) : null;
}

type SourceRow = typeof mcpSources.$inferSelect;

function rowToSource(row: SourceRow): McpSource {
  return {
    id: row.id,
    campaignId: row.campaignId,
    runId: row.runId ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
    title: row.title ?? undefined,
    snippet: row.snippet ?? undefined,
    confidence: row.confidence ?? undefined,
    usedIn: (row.usedInJson as string[] | null) ?? undefined,
    serverName: row.serverName,
    toolName: row.toolName,
    createdAt: row.createdAt,
  };
}
