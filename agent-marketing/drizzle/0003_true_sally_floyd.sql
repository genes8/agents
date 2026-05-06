ALTER TABLE "agent_jobs" ALTER COLUMN "attempts" SET DATA TYPE integer;--> statement-breakpoint
CREATE INDEX "agent_jobs_campaign_id_idx" ON "agent_jobs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "agent_jobs_user_id_idx" ON "agent_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_jobs_status_idx" ON "agent_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_runs_campaign_id_idx" ON "agent_runs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "audit_logs_campaign_id_idx" ON "audit_logs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "campaign_messages_campaign_id_idx" ON "campaign_messages" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_modules_campaign_kind_unique" ON "campaign_modules" USING btree ("campaign_id","module_kind");--> statement-breakpoint
CREATE INDEX "campaign_strategies_campaign_id_idx" ON "campaign_strategies" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaigns_user_id_idx" ON "campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "export_events_campaign_id_idx" ON "export_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "mcp_sources_campaign_id_idx" ON "mcp_sources" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "mcp_sources_run_id_idx" ON "mcp_sources" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "qc_reviews_campaign_id_idx" ON "qc_reviews" USING btree ("campaign_id");