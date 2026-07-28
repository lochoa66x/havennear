CREATE TABLE IF NOT EXISTS platform_operators (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shelter_staff_access (
  id TEXT PRIMARY KEY NOT NULL,
  shelter_id TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'editor',
  status TEXT NOT NULL DEFAULT 'active',
  granted_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS shelter_staff_email_shelter_idx
  ON shelter_staff_access(email, shelter_id);
CREATE INDEX IF NOT EXISTS shelter_staff_email_status_idx
  ON shelter_staff_access(email, status);

CREATE TABLE IF NOT EXISTS shelter_availability_updates (
  id TEXT PRIMARY KEY NOT NULL,
  shelter_id TEXT NOT NULL,
  status TEXT NOT NULL,
  spaces_available INTEGER,
  valid_for_minutes INTEGER NOT NULL,
  hours TEXT NOT NULL,
  intake TEXT NOT NULL,
  groups_json TEXT NOT NULL DEFAULT '[]',
  services_json TEXT NOT NULL DEFAULT '[]',
  updated_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER
);

CREATE INDEX IF NOT EXISTS shelter_updates_shelter_created_idx
  ON shelter_availability_updates(shelter_id, created_at);
