import { eq, and, desc } from "drizzle-orm";
import { DEFAULT_USER_ID } from "../client";
import { campaigns, campaignStrategies, campaignModules, users } from "../schema";
function newId() {
    return crypto.randomUUID();
}
function now() {
    return new Date();
}
export async function ensureUser(db, userId) {
    const existing = (await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!existing) {
        await db.insert(users).values({ id: userId, createdAt: now() });
    }
}
export async function ensureDefaultUser(db) {
    return ensureUser(db, DEFAULT_USER_ID);
}
export async function createCampaign(db, input) {
    const userId = input.userId ?? DEFAULT_USER_ID;
    await ensureUser(db, userId);
    const id = newId();
    const ts = now();
    const name = input.brief.startupName || "Untitled Campaign";
    await db
        .insert(campaigns)
        .values({
        id,
        userId,
        name,
        workflowState: "draft_brief",
        briefJson: input.brief,
        createdAt: ts,
        updatedAt: ts,
    });
    return {
        id,
        workspaceId: id,
        userId,
        name,
        workflowState: "draft_brief",
        brief: input.brief,
        modules: [],
        createdAt: ts,
        updatedAt: ts,
    };
}
export async function getCampaign(db, campaignId, userId = DEFAULT_USER_ID) {
    const row = (await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
        .limit(1))[0];
    if (!row)
        return null;
    const strategy = (await db
        .select()
        .from(campaignStrategies)
        .where(eq(campaignStrategies.campaignId, campaignId))
        .orderBy(desc(campaignStrategies.createdAt))
        .limit(1))[0];
    const moduleRows = await db
        .select()
        .from(campaignModules)
        .where(eq(campaignModules.campaignId, campaignId))
        .orderBy(campaignModules.createdAt);
    const modules = moduleRows.map((m) => ({
        id: m.id,
        campaignId: m.campaignId,
        moduleKind: m.moduleKind,
        output: m.outputJson,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
    }));
    return {
        id: row.id,
        workspaceId: row.id,
        userId: row.userId,
        name: row.name,
        workflowState: row.workflowState,
        brief: row.briefJson,
        strategy: strategy ? strategy.strategyJson : undefined,
        modules,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
export async function listCampaigns(db, userId = DEFAULT_USER_ID) {
    const rows = await db
        .select({
        id: campaigns.id,
        name: campaigns.name,
        workflowState: campaigns.workflowState,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
    })
        .from(campaigns)
        .where(eq(campaigns.userId, userId))
        .orderBy(desc(campaigns.updatedAt));
    return rows.map((r) => ({
        id: r.id,
        name: r.name,
        workflowState: r.workflowState,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    }));
}
export async function saveStrategy(db, campaignId, strategy) {
    const ts = now();
    await db
        .insert(campaignStrategies)
        .values({
        id: newId(),
        campaignId,
        strategyJson: strategy,
        createdAt: ts,
    });
    await db
        .update(campaigns)
        .set({ workflowState: "strategy_ready", updatedAt: ts })
        .where(eq(campaigns.id, campaignId));
}
export async function upsertModule(db, campaignId, moduleKind, output) {
    const ts = now();
    const existing = (await db
        .select()
        .from(campaignModules)
        .where(and(eq(campaignModules.campaignId, campaignId), eq(campaignModules.moduleKind, moduleKind)))
        .limit(1))[0];
    if (existing) {
        await db
            .update(campaignModules)
            .set({ outputJson: output, updatedAt: ts })
            .where(eq(campaignModules.id, existing.id));
        return { ...existing, moduleKind, output, updatedAt: ts };
    }
    const id = newId();
    await db
        .insert(campaignModules)
        .values({
        id,
        campaignId,
        moduleKind,
        outputJson: output,
        createdAt: ts,
        updatedAt: ts,
    });
    const currentCampaign = (await db
        .select({ workflowState: campaigns.workflowState })
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1))[0];
    if (currentCampaign?.workflowState === "strategy_ready") {
        await db
            .update(campaigns)
            .set({ workflowState: "modules_ready", updatedAt: ts })
            .where(eq(campaigns.id, campaignId));
    }
    else {
        await db.update(campaigns).set({ updatedAt: ts }).where(eq(campaigns.id, campaignId));
    }
    return {
        id,
        campaignId,
        moduleKind,
        output,
        createdAt: ts,
        updatedAt: ts,
    };
}
export async function updateWorkflowState(db, campaignId, state) {
    await db
        .update(campaigns)
        .set({ workflowState: state, updatedAt: now() })
        .where(eq(campaigns.id, campaignId));
}
