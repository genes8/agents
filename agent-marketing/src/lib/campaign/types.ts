import type { z } from "zod";
import type {
  CampaignGoalSchema,
  CampaignModuleOutputSchema,
  CampaignModuleSchema,
  CampaignStrategySchema,
  RefineOutputSchema,
} from "./schemas";

export type CampaignGoal = z.infer<typeof CampaignGoalSchema>;
export type CampaignModule = z.infer<typeof CampaignModuleSchema>;

export type CampaignBrief = {
  startupName: string;
  productDescription: string;
  targetAudience: string;
  problemSolved: string;
  campaignGoal: CampaignGoal;
  landingPageUrl?: string;
  competitors: string[];
  tone: string[];
  extraContext?: string;
};

export type CampaignStrategy = z.infer<typeof CampaignStrategySchema>;
export type CampaignModuleOutput = z.infer<typeof CampaignModuleOutputSchema>;
export type RefineOutput = z.infer<typeof RefineOutputSchema>;

export type CampaignWorkspace = {
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  modules: CampaignModuleOutput[];
};

// --- Persisted identity types ---

export type UserId = string;
export type CampaignId = string;
export type WorkspaceId = string;
export type RunId = string;
export type CampaignModuleId = string;
export type McpSourceId = string;
export type QcReviewId = string;
export type ExportEventId = string;

// --- Workflow state machine ---

export type CampaignWorkflowState =
  | "draft_brief"
  | "research_ready"
  | "strategy_ready"
  | "modules_ready"
  | "review_pending"
  | "approved"
  | "exported";

export type CampaignEvent =
  | "BRIEF_SAVED"
  | "RESEARCH_COMPLETED"
  | "STRATEGY_GENERATED"
  | "MODULE_GENERATED"
  | "QC_REQUESTED"
  | "QC_APPROVED"
  | "QC_REJECTED"
  | "EXPORTED"
  | "RESET_TO_DRAFT";

// --- Persisted domain types ---

export type PersistedCampaignModule = {
  id: CampaignModuleId;
  campaignId: CampaignId;
  moduleKind: CampaignModule;
  output: CampaignModuleOutput;
  createdAt: Date;
  updatedAt: Date;
};

export type PersistedCampaignWorkspace = {
  id: CampaignId;
  workspaceId: WorkspaceId;
  userId: UserId;
  name: string;
  workflowState: CampaignWorkflowState;
  brief: CampaignBrief;
  strategy?: CampaignStrategy;
  modules: PersistedCampaignModule[];
  createdAt: Date;
  updatedAt: Date;
};

export type GenerationRun = {
  id: RunId;
  campaignId: CampaignId;
  nodeName: string;
  model?: string;
  status: "running" | "success" | "failed";
  stateBefore?: CampaignWorkflowState;
  stateAfter?: CampaignWorkflowState;
  errorType?: string;
  errorMessage?: string;
  latencyMs?: number;
  createdAt: Date;
  completedAt?: Date;
};

export type McpSource = {
  id: McpSourceId;
  campaignId: CampaignId;
  runId?: RunId;
  sourceUrl?: string;
  title?: string;
  snippet?: string;
  confidence?: number;
  usedIn?: string[];
  serverName: string;
  toolName: string;
  createdAt: Date;
};

export type ExportEvent = {
  id: ExportEventId;
  campaignId: CampaignId;
  userId?: UserId;
  format: string;
  createdAt: Date;
};

export type CampaignMessage = {
  id: string;
  campaignId: CampaignId;
  role: "user" | "assistant" | "system";
  content: string;
  messageType: "chat" | "refinement" | "system_event";
  moduleId?: CampaignModuleId;
  runId?: RunId;
  createdAt: Date;
};

export type PersistedQcReview = {
  id: QcReviewId;
  campaignId: CampaignId;
  moduleId?: CampaignModuleId;
  runId?: RunId;
  reviewer: "brand_safety" | "claim_verifier" | "platform_compliance" | "tone_consistency" | "conversion";
  verdict: "pass" | "warn" | "fail";
  issues: QcReviewIssue[];
  suggestedEdits?: string[];
  confidence?: number;
  linkedSourceIds?: McpSourceId[];
  createdAt: Date;
};

export type QcVerdict = "pass" | "warn" | "fail";

export type QcReviewIssue = {
  severity: "error" | "warning" | "info";
  message: string;
};

export type QcReviewResult = {
  reviewer: "brand_safety" | "claim_verifier" | "platform_compliance" | "tone_consistency" | "conversion";
  verdict: QcVerdict;
  issues: QcReviewIssue[];
  suggestedEdits?: string[];
  confidence: number;
  linkedSourceIds?: McpSourceId[];
};
