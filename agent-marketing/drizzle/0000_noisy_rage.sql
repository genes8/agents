CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`node_name` text NOT NULL,
	`model` text,
	`status` text DEFAULT 'running' NOT NULL,
	`state_before` text,
	`state_after` text,
	`error_type` text,
	`error_message` text,
	`latency_ms` integer,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaign_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`message_type` text DEFAULT 'chat' NOT NULL,
	`module_id` text,
	`run_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaign_modules` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`module_kind` text NOT NULL,
	`output_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaign_strategies` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`strategy_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`workflow_state` text DEFAULT 'draft_brief' NOT NULL,
	`brief_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `export_events` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`user_id` text,
	`format` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mcp_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`run_id` text,
	`source_url` text,
	`title` text,
	`snippet` text,
	`confidence` real,
	`used_in_json` text,
	`server_name` text NOT NULL,
	`tool_name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `agent_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`created_at` integer NOT NULL
);
