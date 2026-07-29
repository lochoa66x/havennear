CREATE TABLE `shelter_correction_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`shelter_id` text NOT NULL,
	`correction_type` text NOT NULL,
	`details` text NOT NULL,
	`source_url` text,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`reviewed_by` text,
	`created_at` integer NOT NULL,
	`reviewed_at` integer
);
--> statement-breakpoint
CREATE INDEX `shelter_corrections_status_created_idx`
	ON `shelter_correction_requests` (`status`, `created_at`);
