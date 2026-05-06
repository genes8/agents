import type { CampaignId, CampaignModule, UserId } from "../campaign/types";

export type AgentJobId = string;

export type AgentJobType = "generate_strategy" | "generate_module" | "refine_module" | "chat_refine";

export type AgentJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type AgentJobPayload =
  | Record<string, never>
  | { module: CampaignModule }
  | { moduleId: string; instruction: string }
  | { content: string };

export type AgentJobProgress = {
  step: string;
  message?: string;
};

export type AgentJobError = {
  message: string;
  type?: string;
};

export type AgentJob = {
  id: AgentJobId;
  campaignId: CampaignId;
  userId: UserId;
  type: AgentJobType;
  status: AgentJobStatus;
  payload: AgentJobPayload;
  progress: AgentJobProgress;
  error?: AgentJobError;
  bossJobId?: string;
  attempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
};
