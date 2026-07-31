ALTER TABLE `research_candidates` ADD `verification_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `research_candidates` ADD `verification_checks_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `research_candidates` ADD `verification_state` text DEFAULT 'unstarted' NOT NULL;--> statement-breakpoint
ALTER TABLE `research_candidates` ADD `directory_ready` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `research_candidates`
SET `review_state` = 'excluded_sensitive',
    `verification_state` = 'excluded_sensitive',
    `directory_ready` = false,
    `reviewer_notes` = CASE
      WHEN `source_record_id` IN ('1053', '1054') THEN 'Health-specific supportive housing is outside HavenNear''s general public shelter scope.'
      WHEN `source_record_id` = '1741' THEN 'Refugee-specific transitional housing is outside HavenNear''s public directory scope.'
      WHEN `source_record_id` = '1001' THEN 'The source combines family sheltering with gender-based violence and refugee services; exclude conservatively.'
      ELSE `reviewer_notes`
    END
WHERE `batch_id` = 'research_toronto_20260729_general25_v2'
  AND `source_record_id` IN ('1053', '1054', '1741', '1001');
