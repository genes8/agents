CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"user_id" text,
	"campaign_id" text,
	"job_id" text,
	"run_id" text,
	"meta" jsonb,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "prompt_tokens" integer;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "completion_tokens" integer;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "total_tokens" integer;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "estimated_cost_usd" real;