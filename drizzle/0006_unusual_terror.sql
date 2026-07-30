ALTER TABLE `shelters` ADD `scope_state` text DEFAULT 'unreviewed' NOT NULL;

-- Public pilot listings reviewed as established, public-facing general shelters.
UPDATE `shelters`
SET `scope_state` = 'eligible_general'
WHERE `id` IN (
  'old-brewery-webster',
  'maison-du-pere',
  'welcome-hall-macaulay',
  'refuge-des-jeunes',
  'paq-main',
  'mitshuap'
);

-- These listings are intentionally retained only as archived audit history.
UPDATE `shelters`
SET `publication_state` = 'archived',
    `scope_state` = 'excluded_sensitive',
    `updated_at` = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE `id` IN (
  'old-brewery-mackenzie',
  'chez-doris',
  'dans-la-rue-bunker',
  'auberge-shalom'
);

-- Keep sensitive federal candidates out of the human approval queue.
UPDATE `directory_staging_records`
SET `review_state` = 'excluded_sensitive',
    `reviewer_notes` = 'Excluded by HavenNear sensitive-shelter policy.',
    `reviewed_at` = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE `review_state` = 'pending'
  AND (
    COALESCE(json_extract(`parsed_json`, '$.confidentialAddress'), 0) = 1
    OR LOWER(COALESCE(json_extract(`parsed_json`, '$.genderServed'), '')) IN ('women', 'woman', 'female', 'femmes', 'femme')
    OR LOWER(
      COALESCE(json_extract(`parsed_json`, '$.name'), '') || ' ' ||
      COALESCE(json_extract(`parsed_json`, '$.umbrellaOrganization'), '') || ' ' ||
      COALESCE(json_extract(`parsed_json`, '$.targetClientele'), '') || ' ' ||
      COALESCE(json_extract(`parsed_json`, '$.shelterType'), '')
    ) GLOB '*violence*'
    OR LOWER(`parsed_json`) GLOB '*victim*'
    OR LOWER(`parsed_json`) GLOB '*survivor*'
    OR LOWER(`parsed_json`) GLOB '*abuse*'
    OR LOWER(`parsed_json`) GLOB '*trafficking*'
    OR LOWER(`parsed_json`) GLOB '*refugee*'
    OR LOWER(`parsed_json`) GLOB '*asylum*'
    OR LOWER(`parsed_json`) GLOB '*safe house*'
    OR LOWER(`parsed_json`) GLOB '*motel/hotel shelter*'
    OR LOWER(`parsed_json`) GLOB '*hotel program*'
  );

-- Remove the original unscreened Toronto pilot; the application seeds v2.
DELETE FROM `research_candidate_citations`
WHERE `candidate_id` IN (
  SELECT `id` FROM `research_candidates`
  WHERE `batch_id` = 'research_toronto_20260729_pilot25'
);
DELETE FROM `research_candidates`
WHERE `batch_id` = 'research_toronto_20260729_pilot25';
DELETE FROM `research_batches`
WHERE `id` = 'research_toronto_20260729_pilot25';
