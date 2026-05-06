export type AuditEventName =
  | "campaign.created"
  | "job.enqueued"
  | "job.started"
  | "job.succeeded"
  | "job.failed"
  | "job.cancelled"
  | "node.started"
  | "node.completed"
  | "qc.completed"
  | "human.approved"
  | "export.downloaded";

export type AuditEventInput = {
  event: AuditEventName;
  userId?: string;
  campaignId?: string;
  jobId?: string;
  runId?: string;
  meta?: Record<string, unknown>;
};
