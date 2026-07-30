CREATE TABLE `research_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`dataset_name` text NOT NULL,
	`publisher` text NOT NULL,
	`dataset_version` text NOT NULL,
	`source_url` text NOT NULL,
	`licence` text NOT NULL,
	`licence_url` text NOT NULL,
	`retrieved_at` integer NOT NULL,
	`checksum` text NOT NULL,
	`run_limit` integer NOT NULL,
	`scale_target` integer DEFAULT 100 NOT NULL,
	`total_rows` integer DEFAULT 0 NOT NULL,
	`exact_matches` integer DEFAULT 0 NOT NULL,
	`probable_matches` integer DEFAULT 0 NOT NULL,
	`ambiguous_matches` integer DEFAULT 0 NOT NULL,
	`unmatched_rows` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pilot' NOT NULL,
	`publication_guard` text DEFAULT 'private_review_only' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_candidate_citations` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`publisher` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`licence` text NOT NULL,
	`licence_url` text NOT NULL,
	`retrieved_at` integer NOT NULL,
	`source_version` text NOT NULL,
	`fields_supported_json` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`source_record_id` text NOT NULL,
	`source_row_json` text NOT NULL,
	`proposed_changes_json` text NOT NULL,
	`matched_staging_record_id` text,
	`matched_shelter_id` text,
	`match_state` text DEFAULT 'unmatched' NOT NULL,
	`match_score` real DEFAULT 0 NOT NULL,
	`match_explanation` text DEFAULT '' NOT NULL,
	`privacy_flags_json` text DEFAULT '[]' NOT NULL,
	`review_state` text DEFAULT 'pending' NOT NULL,
	`review_outcome` text,
	`reviewer_notes` text DEFAULT '' NOT NULL,
	`privacy_cleared` integer DEFAULT false NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_source_record_idx`
	ON `research_candidates` (`batch_id`, `source_record_id`);
--> statement-breakpoint
CREATE INDEX `research_match_review_idx`
	ON `research_candidates` (`batch_id`, `match_state`, `review_state`);
--> statement-breakpoint
CREATE INDEX `research_citation_candidate_idx`
	ON `research_candidate_citations` (`candidate_id`);
