CREATE TABLE IF NOT EXISTS shelters (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  legal_name TEXT,
  name TEXT NOT NULL,
  alternate_names_json TEXT NOT NULL DEFAULT '[]',
  shelter_type TEXT NOT NULL DEFAULT 'Emergency shelter',
  address TEXT,
  city TEXT NOT NULL,
  province_code TEXT NOT NULL,
  postal_code TEXT,
  country_code TEXT NOT NULL DEFAULT 'CA',
  latitude REAL,
  longitude REAL,
  confidential_address INTEGER NOT NULL DEFAULT 0,
  phone TEXT NOT NULL,
  phone_display TEXT NOT NULL,
  public_email TEXT,
  website TEXT,
  hours TEXT NOT NULL,
  intake TEXT NOT NULL,
  groups_json TEXT NOT NULL DEFAULT '[]',
  services_json TEXT NOT NULL DEFAULT '[]',
  accessibility_json TEXT NOT NULL DEFAULT '[]',
  languages_json TEXT NOT NULL DEFAULT '[]',
  total_beds INTEGER,
  participation_state TEXT NOT NULL DEFAULT 'directory',
  publication_state TEXT NOT NULL DEFAULT 'draft',
  availability_status TEXT NOT NULL DEFAULT 'call',
  spaces_available INTEGER,
  availability_updated_at INTEGER,
  availability_expires_at INTEGER,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shelter_sources (
  id TEXT PRIMARY KEY NOT NULL,
  shelter_id TEXT,
  staging_record_id TEXT,
  source_organization TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'official_website',
  licence TEXT,
  publication_date TEXT,
  retrieved_at INTEGER NOT NULL,
  verified_at INTEGER,
  fields_supported_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS directory_import_batches (
  id TEXT PRIMARY KEY NOT NULL,
  dataset_name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  dataset_version TEXT,
  source_url TEXT NOT NULL,
  licence TEXT,
  file_name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  imported_at INTEGER NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  accepted_rows INTEGER NOT NULL DEFAULT 0,
  rejected_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_candidates INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'staged',
  created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS directory_staging_records (
  id TEXT PRIMARY KEY NOT NULL,
  batch_id TEXT NOT NULL,
  source_row_json TEXT NOT NULL,
  parsed_json TEXT NOT NULL,
  validation_warnings_json TEXT NOT NULL DEFAULT '[]',
  duplicate_candidates_json TEXT NOT NULL DEFAULT '[]',
  reviewer_notes TEXT NOT NULL DEFAULT '',
  review_state TEXT NOT NULL DEFAULT 'pending',
  approved_shelter_id TEXT,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);

CREATE TABLE IF NOT EXISTS directory_review_activity (
  id TEXT PRIMARY KEY NOT NULL,
  shelter_id TEXT,
  staging_record_id TEXT,
  action TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  changed_fields_json TEXT NOT NULL DEFAULT '[]',
  reason TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS shelters_public_location_idx ON shelters(publication_state, province_code, city);
CREATE INDEX IF NOT EXISTS staging_review_idx ON directory_staging_records(review_state, created_at);
CREATE INDEX IF NOT EXISTS review_activity_created_idx ON directory_review_activity(created_at);
