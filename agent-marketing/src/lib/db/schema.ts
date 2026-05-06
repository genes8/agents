import { pgTable, text, timestamp, real, jsonb, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  createdAt: timestamp("created_at").notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  workflowState: text("workflow_state").notNull().default("draft_brief"),
  briefJson: jsonb("brief_json").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
}, (t) => [
  index("campaigns_user_id_idx").on(t.userId),
]);

export const campaignStrategies = pgTable("campaign_strategies", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  strategyJson: jsonb("strategy_json").notNull(),
  createdAt: timestamp("created_at").notNull(),
}, (t) => [
  index("campaign_strategies_campaign_id_idx").on(t.campaignId),
]);

export const campaignModules = pgTable("campaign_modules", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  moduleKind: text("module_kind").notNull(),
  outputJson: jsonb("output_json").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
}, (t) => [
  uniqueIndex("campaign_modules_campaign_kind_unique").on(t.campaignId, t.moduleKind),
]);

export const agentRuns = pgTable("agent_runs", {
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
  latencyMs: real("latency_ms"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalTokens: integer("total_tokens"),
  estimatedCostUsd: real("estimated_cost_usd"),
  createdAt: timestamp("created_at").notNull(),
  completedAt: timestamp("completed_at"),
}, (t) => [
  index("agent_runs_campaign_id_idx").on(t.campaignId),
]);

export const mcpSources = pgTable("mcp_sources", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  runId: text("run_id").references(() => agentRuns.id),
  sourceUrl: text("source_url"),
  title: text("title"),
  snippet: text("snippet"),
  confidence: real("confidence"),
  usedInJson: jsonb("used_in_json"),
  serverName: text("server_name").notNull(),
  toolName: text("tool_name").notNull(),
  createdAt: timestamp("created_at").notNull(),
}, (t) => [
  index("mcp_sources_campaign_id_idx").on(t.campaignId),
  index("mcp_sources_run_id_idx").on(t.runId),
]);

export const campaignMessages = pgTable("campaign_messages", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("chat"),
  moduleId: text("module_id"),
  runId: text("run_id"),
  createdAt: timestamp("created_at").notNull(),
}, (t) => [
  index("campaign_messages_campaign_id_idx").on(t.campaignId),
]);

export const exportEvents = pgTable("export_events", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  userId: text("user_id"),
  format: text("format").notNull(),
  createdAt: timestamp("created_at").notNull(),
}, (t) => [
  index("export_events_campaign_id_idx").on(t.campaignId),
]);

export const qcReviews = pgTable("qc_reviews", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  moduleId: text("module_id").references(() => campaignModules.id),
  runId: text("run_id").references(() => agentRuns.id),
  reviewer: text("reviewer").notNull(),
  verdict: text("verdict").notNull(),
  issuesJson: jsonb("issues_json").notNull(),
  suggestedEditsJson: jsonb("suggested_edits_json"),
  confidence: real("confidence"),
  linkedSourceIdsJson: jsonb("linked_source_ids_json"),
  createdAt: timestamp("created_at").notNull(),
}, (t) => [
  index("qc_reviews_campaign_id_idx").on(t.campaignId),
]);

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  event: text("event").notNull(),
  userId: text("user_id"),
  campaignId: text("campaign_id"),
  jobId: text("job_id"),
  runId: text("run_id"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull(),
}, (t) => [
  index("audit_logs_campaign_id_idx").on(t.campaignId),
  index("audit_logs_created_at_idx").on(t.createdAt),
]);

export const agentJobs = pgTable("agent_jobs", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  payloadJson: jsonb("payload_json").notNull(),
  progressJson: jsonb("progress_json"),
  errorJson: jsonb("error_json"),
  bossJobId: text("boss_job_id"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (t) => [
  index("agent_jobs_campaign_id_idx").on(t.campaignId),
  index("agent_jobs_user_id_idx").on(t.userId),
  index("agent_jobs_status_idx").on(t.status),
]);
