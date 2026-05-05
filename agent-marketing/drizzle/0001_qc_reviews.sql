CREATE TABLE `qc_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`module_id` text,
	`run_id` text,
	`reviewer` text NOT NULL,
	`verdict` text NOT NULL,
	`issues_json` text NOT NULL,
	`suggested_edits_json` text,
	`confidence` real,
	`linked_source_ids_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`module_id`) REFERENCES `campaign_modules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `agent_runs`(`id`) ON UPDATE no action ON DELETE no action
);
