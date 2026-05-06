import { eq, and, desc } from "drizzle-orm";
import type { Db } from "../client";
import { DEFAULT_USER_ID } from "../client";
import { campaigns, campaignStrategies, campaignModules, users } from "../schema";
import type {
  CampaignBrief,
  CampaignId,
  CampaignModule,
  CampaignModuleOutput,
  CampaignStrategy,
  CampaignWorkflowState,
  PersistedCampaignModule,
  PersistedCampaignWorkspace,
  UserId,
} from "../../campaign/types";

function newId(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
}

export async function ensureUser(db: Db, userId: UserId): Promise<void> {
  await db.insert(users).values({ id: userId, createdAt: now() }).onConflictDoNothing();
}

export async function ensureDefaultUser(db: Db): Promise<void> {
  return ensureUser(db, DEFAULT_USER_ID);
}

export async function createCampaign(
  db: Db,
  input: { brief: CampaignBrief; userId?: UserId },
): Promise<PersistedCampaignWorkspace> {
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
    })
    ;

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

export async function getCampaign(
  db: Db,
  campaignId: CampaignId,
  userId: UserId = DEFAULT_USER_ID,
): Promise<PersistedCampaignWorkspace | null> {
  const row = (await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
    .limit(1))[0];

  if (!row) return null;

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

  const modules: PersistedCampaignModule[] = moduleRows.map((m) => ({
    id: m.id,
    campaignId: m.campaignId,
    moduleKind: m.moduleKind as CampaignModule,
    output: m.outputJson as CampaignModuleOutput,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));

  return {
    id: row.id,
    workspaceId: row.id,
    userId: row.userId,
    name: row.name,
    workflowState: row.workflowState as CampaignWorkflowState,
    brief: row.briefJson as CampaignBrief,
    strategy: strategy ? (strategy.strategyJson as CampaignStrategy) : undefined,
    modules,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listCampaigns(
  db: Db,
  userId: UserId = DEFAULT_USER_ID,
): Promise<Pick<PersistedCampaignWorkspace, "id" | "name" | "workflowState" | "createdAt" | "updatedAt">[]> {
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
    workflowState: r.workflowState as CampaignWorkflowState,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function saveStrategy(
  db: Db,
  campaignId: CampaignId,
  strategy: CampaignStrategy,
): Promise<void> {
  const ts = now();
  await db
    .insert(campaignStrategies)
    .values({
      id: newId(),
      campaignId,
      strategyJson: strategy,
      createdAt: ts,
    })
    ;
  await db
    .update(campaigns)
    .set({ workflowState: "strategy_ready", updatedAt: ts })
    .where(eq(campaigns.id, campaignId))
    ;
}

export async function upsertModule(
  db: Db,
  campaignId: CampaignId,
  moduleKind: CampaignModule,
  output: CampaignModuleOutput,
): Promise<PersistedCampaignModule> {
  const ts = now();

  return db.transaction(async (tx) => {
    const existing = (await tx
      .select()
      .from(campaignModules)
      .where(and(eq(campaignModules.campaignId, campaignId), eq(campaignModules.moduleKind, moduleKind)))
      .limit(1))[0];

    if (existing) {
      await tx
        .update(campaignModules)
        .set({ outputJson: output, updatedAt: ts })
        .where(eq(campaignModules.id, existing.id));
      return { ...existing, moduleKind, output, updatedAt: ts };
    }

    const id = newId();
    await tx.insert(campaignModules).values({ id, campaignId, moduleKind, outputJson: output, createdAt: ts, updatedAt: ts });

    const currentCampaign = (await tx
      .select({ workflowState: campaigns.workflowState })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1))[0];

    if (currentCampaign?.workflowState === "strategy_ready") {
      await tx.update(campaigns).set({ workflowState: "modules_ready", updatedAt: ts }).where(eq(campaigns.id, campaignId));
    } else {
      await tx.update(campaigns).set({ updatedAt: ts }).where(eq(campaigns.id, campaignId));
    }

    return { id, campaignId, moduleKind, output, createdAt: ts, updatedAt: ts };
  });
}

export async function updateWorkflowState(
  db: Db,
  campaignId: CampaignId,
  state: CampaignWorkflowState,
): Promise<void> {
  await db
    .update(campaigns)
    .set({ workflowState: state, updatedAt: now() })
    .where(eq(campaigns.id, campaignId))
    ;
}
