import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  workflowState: text("workflow_state").notNull().default("draft_brief"),
  briefJson: text("brief_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const campaignStrategies = sqliteTable("campaign_strategies", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  strategyJson: text("strategy_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const campaignModules = sqliteTable("campaign_modules", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  moduleKind: text("module_kind").notNull(),
  outputJson: text("output_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const agentRuns = sqliteTable("agent_runs", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  nodeName: text("node_name").notNull(),
  model: text("model"),
  status: text("status").notNull().default("running"),
  stateBefore: text("state_before"),
  stateAfter: text("state_after"),
  errorType: text("error_type"),
  errorMessage: text("error_message"),
  latencyMs: integer("latency_ms"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
});

export const mcpSources = sqliteTable("mcp_sources", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  runId: text("run_id").references(() => agentRuns.id),
  sourceUrl: text("source_url"),
  title: text("title"),
  snippet: text("snippet"),
  confidence: real("confidence"),
  usedInJson: text("used_in_json"),
  serverName: text("server_name").notNull(),
  toolName: text("tool_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const campaignMessages = sqliteTable("campaign_messages", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("chat"),
  moduleId: text("module_id"),
  runId: text("run_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const exportEvents = sqliteTable("export_events", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  userId: text("user_id"),
  format: text("format").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const qcReviews = sqliteTable("qc_reviews", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  moduleId: text("module_id").references(() => campaignModules.id),
  runId: text("run_id").references(() => agentRuns.id),
  reviewer: text("reviewer").notNull(),
  verdict: text("verdict").notNull(),
  issuesJson: text("issues_json").notNull(),
  suggestedEditsJson: text("suggested_edits_json"),
  confidence: real("confidence"),
  linkedSourceIdsJson: text("linked_source_ids_json"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
