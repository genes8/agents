import { eq } from "drizzle-orm";
import { mcpSources } from "../schema";
function newId() {
    return crypto.randomUUID();
}
function now() {
    return new Date();
}
export async function saveSource(db, input) {
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
    });
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
export async function getSourcesByCampaign(db, campaignId) {
    const rows = await db
        .select()
        .from(mcpSources)
        .where(eq(mcpSources.campaignId, campaignId))
        .orderBy(mcpSources.createdAt);
    return rows.map(rowToSource);
}
export async function getSourcesByRun(db, runId) {
    const rows = await db
        .select()
        .from(mcpSources)
        .where(eq(mcpSources.runId, runId))
        .orderBy(mcpSources.createdAt);
    return rows.map(rowToSource);
}
export async function getSourceById(db, sourceId) {
    const row = (await db.select().from(mcpSources).where(eq(mcpSources.id, sourceId)).limit(1))[0];
    return row ? rowToSource(row) : null;
}
function rowToSource(row) {
    return {
        id: row.id,
        campaignId: row.campaignId,
        runId: row.runId ?? undefined,
        sourceUrl: row.sourceUrl ?? undefined,
        title: row.title ?? undefined,
        snippet: row.snippet ?? undefined,
        confidence: row.confidence ?? undefined,
        usedIn: row.usedInJson ?? undefined,
        serverName: row.serverName,
        toolName: row.toolName,
        createdAt: row.createdAt,
    };
}
