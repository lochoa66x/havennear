import { env } from "cloudflare:workers";
import { ensureDirectorySchema, ensureMontrealSeed } from "./directory";

type Row = Record<string, unknown>;
export type AvailabilityStatus = "available" | "limited" | "full" | "call";

const participationSchema = [
  `CREATE TABLE IF NOT EXISTS platform_operators (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS shelter_staff_access (
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
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS shelter_staff_email_shelter_idx
    ON shelter_staff_access(email, shelter_id)`,
  `CREATE INDEX IF NOT EXISTS shelter_staff_email_status_idx
    ON shelter_staff_access(email, status)`,
  `CREATE TABLE IF NOT EXISTS shelter_availability_updates (
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
  )`,
  `CREATE INDEX IF NOT EXISTS shelter_updates_shelter_created_idx
    ON shelter_availability_updates(shelter_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS shelter_enrollment_requests (
    id TEXT PRIMARY KEY NOT NULL,
    shelter_id TEXT,
    organization_name TEXT NOT NULL,
    city TEXT NOT NULL,
    province_code TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    role TEXT NOT NULL,
    official_email TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending_verification',
    created_at INTEGER NOT NULL
  )`,
];

const cleanEmail = (email: string) => email.trim().toLowerCase();
const stringArray = (value: unknown): string[] => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

export async function ensureParticipationSchema() {
  await ensureDirectorySchema();
  await ensureMontrealSeed();
  await env.DB.batch(participationSchema.map((statement) => env.DB.prepare(statement)));
}

export async function isPlatformOperator(email: string, displayName: string, bootstrap = false) {
  await ensureParticipationSchema();
  const normalized = cleanEmail(email);
  if (bootstrap) {
    const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM platform_operators`)
      .first<{ total: number }>();
    if ((count?.total ?? 0) === 0) {
      const now = Date.now();
      await env.DB.prepare(`
        INSERT OR IGNORE INTO platform_operators (
          id, email, display_name, role, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'owner', 'active', ?, ?)
      `).bind(`operator_${crypto.randomUUID()}`, normalized, displayName, now, now).run();
    }
  }
  const operator = await env.DB.prepare(`
    SELECT id FROM platform_operators WHERE LOWER(email) = ? AND status = 'active'
  `).bind(normalized).first();
  return Boolean(operator);
}

export async function getStaffWorkspace(email: string) {
  await ensureParticipationSchema();
  const normalized = cleanEmail(email);
  const access = await env.DB.prepare(`
    SELECT
      a.id AS access_id, a.role AS access_role, a.status AS access_status,
      s.*
    FROM shelter_staff_access a
    JOIN shelters s ON s.id = a.shelter_id
    WHERE LOWER(a.email) = ? AND a.status = 'active' AND s.publication_state = 'published'
    ORDER BY a.created_at
    LIMIT 1
  `).bind(normalized).first<Row>();
  if (!access) return null;

  await env.DB.prepare(`UPDATE shelter_staff_access SET last_used_at = ? WHERE id = ?`)
    .bind(Date.now(), access.access_id).run();
  const history = await env.DB.prepare(`
    SELECT id, status, spaces_available, valid_for_minutes, updated_by, created_at, expires_at
    FROM shelter_availability_updates
    WHERE shelter_id = ?
    ORDER BY created_at DESC
    LIMIT 12
  `).bind(access.id).all<Row>();

  return {
    shelter: {
      id: String(access.id),
      name: String(access.name),
      city: String(access.city),
      provinceCode: String(access.province_code),
      status: String(access.availability_status) as AvailabilityStatus,
      spacesAvailable: typeof access.spaces_available === "number" ? access.spaces_available : null,
      availabilityUpdatedAt: typeof access.availability_updated_at === "number" ? access.availability_updated_at : null,
      availabilityExpiresAt: typeof access.availability_expires_at === "number" ? access.availability_expires_at : null,
      hours: String(access.hours),
      intake: String(access.intake),
      groups: stringArray(access.groups_json),
      services: stringArray(access.services_json),
      confidentialAddress: access.confidential_address === 1,
      participationState: String(access.participation_state),
    },
    access: {
      role: String(access.access_role),
    },
    history: history.results,
  };
}

export async function publishShelterUpdate(input: {
  email: string;
  shelterId: string;
  status: AvailabilityStatus;
  spacesAvailable: number | null;
  validForMinutes: number;
  hours: string;
  intake: string;
  groups: string[];
  services: string[];
}) {
  await ensureParticipationSchema();
  const normalized = cleanEmail(input.email);
  const access = await env.DB.prepare(`
    SELECT id FROM shelter_staff_access
    WHERE shelter_id = ? AND LOWER(email) = ? AND status = 'active'
  `).bind(input.shelterId, normalized).first();
  if (!access) throw new Error("You are not authorized to update this shelter.");

  const allowedStatuses = new Set<AvailabilityStatus>(["available", "limited", "full", "call"]);
  if (!allowedStatuses.has(input.status)) throw new Error("Choose a valid availability status.");
  if (input.spacesAvailable !== null && !Number.isFinite(input.spacesAvailable)) {
    throw new Error("Spaces available must be a valid number.");
  }
  const validFor = Math.min(240, Math.max(30, Math.round(input.validForMinutes)));
  const spaces = input.status === "full"
    ? 0
    : input.status === "call"
      ? null
      : input.spacesAvailable === null
        ? null
        : Math.min(9999, Math.max(0, Math.round(input.spacesAvailable)));
  const hours = input.hours.trim().slice(0, 500);
  const intake = input.intake.trim().slice(0, 1000);
  if (!hours || !intake) throw new Error("Public hours and intake guidance are required.");
  const groups = input.groups.map((item) => item.trim().slice(0, 80)).filter(Boolean).slice(0, 30);
  const services = input.services.map((item) => item.trim().slice(0, 80)).filter(Boolean).slice(0, 30);
  const now = Date.now();
  const expiresAt = input.status === "call" ? null : now + validFor * 60_000;
  const updateId = `update_${crypto.randomUUID()}`;

  await env.DB.batch([
    env.DB.prepare(`
      UPDATE shelters SET
        participation_state = 'participating',
        availability_status = ?,
        spaces_available = ?,
        availability_updated_at = ?,
        availability_expires_at = ?,
        hours = ?,
        intake = ?,
        groups_json = ?,
        services_json = ?,
        updated_at = ?
      WHERE id = ? AND publication_state = 'published'
    `).bind(
      input.status, spaces, now, expiresAt, hours, intake,
      JSON.stringify(groups), JSON.stringify(services), now, input.shelterId,
    ),
    env.DB.prepare(`
      INSERT INTO shelter_availability_updates (
        id, shelter_id, status, spaces_available, valid_for_minutes,
        hours, intake, groups_json, services_json, updated_by, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      updateId, input.shelterId, input.status, spaces, validFor,
      hours, intake, JSON.stringify(groups), JSON.stringify(services),
      normalized, now, expiresAt,
    ),
    env.DB.prepare(`
      INSERT INTO directory_review_activity (
        id, shelter_id, action, actor_email, changed_fields_json, reason, created_at
      ) VALUES (?, ?, 'shelter_public_update', ?, ?, '', ?)
    `).bind(
      `activity_${crypto.randomUUID()}`, input.shelterId, normalized,
      JSON.stringify(["availability", "hours", "intake", "groups", "services"]), now,
    ),
  ]);

  return { updateId, updatedAt: now, expiresAt };
}

export async function getParticipantReviewDashboard() {
  await ensureParticipationSchema();
  const [requests, shelters, grants] = await Promise.all([
    env.DB.prepare(`
      SELECT * FROM shelter_enrollment_requests
      ORDER BY CASE status WHEN 'pending_verification' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 100
    `).all<Row>(),
    env.DB.prepare(`
      SELECT id, name, city, province_code, publication_state
      FROM shelters WHERE publication_state IN ('published', 'approved')
      ORDER BY name COLLATE NOCASE
    `).all<Row>(),
    env.DB.prepare(`
      SELECT a.*, s.name AS shelter_name, s.city AS shelter_city
      FROM shelter_staff_access a
      JOIN shelters s ON s.id = a.shelter_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all<Row>(),
  ]);
  return { requests: requests.results, shelters: shelters.results, grants: grants.results };
}

export async function approveEnrollment(input: {
  requestId: string;
  shelterId: string;
  actorEmail: string;
}) {
  await ensureParticipationSchema();
  const request = await env.DB.prepare(`
    SELECT * FROM shelter_enrollment_requests WHERE id = ? AND status = 'pending_verification'
  `).bind(input.requestId).first<Row>();
  if (!request) throw new Error("This request is no longer pending.");
  const shelter = await env.DB.prepare(`
    SELECT id FROM shelters WHERE id = ? AND publication_state = 'published'
  `).bind(input.shelterId).first();
  if (!shelter) throw new Error("Choose a published shelter.");
  const now = Date.now();
  const staffEmail = cleanEmail(String(request.official_email));
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO shelter_staff_access (
        id, shelter_id, email, display_name, role, status, granted_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'editor', 'active', ?, ?, ?)
      ON CONFLICT(email, shelter_id) DO UPDATE SET
        display_name = excluded.display_name,
        status = 'active',
        granted_by = excluded.granted_by,
        updated_at = excluded.updated_at
    `).bind(
      `access_${crypto.randomUUID()}`, input.shelterId, staffEmail,
      String(request.contact_name), input.actorEmail, now, now,
    ),
    env.DB.prepare(`
      UPDATE shelter_enrollment_requests SET shelter_id = ?, status = 'approved' WHERE id = ?
    `).bind(input.shelterId, input.requestId),
    env.DB.prepare(`
      INSERT INTO directory_review_activity (
        id, shelter_id, action, actor_email, changed_fields_json, reason, created_at
      ) VALUES (?, ?, 'staff_access_granted', ?, ?, ?, ?)
    `).bind(
      `activity_${crypto.randomUUID()}`, input.shelterId, input.actorEmail,
      JSON.stringify(["staff_access"]), `Approved enrolment ${input.requestId}`, now,
    ),
  ]);
}

export async function rejectEnrollment(requestId: string, reason: string, actorEmail: string) {
  await ensureParticipationSchema();
  if (!reason.trim()) throw new Error("A rejection reason is required.");
  const request = await env.DB.prepare(`
    SELECT shelter_id FROM shelter_enrollment_requests WHERE id = ? AND status = 'pending_verification'
  `).bind(requestId).first<Row>();
  if (!request) throw new Error("This request is no longer pending.");
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`UPDATE shelter_enrollment_requests SET status = 'rejected' WHERE id = ?`).bind(requestId),
    env.DB.prepare(`
      INSERT INTO directory_review_activity (
        id, shelter_id, action, actor_email, changed_fields_json, reason, created_at
      ) VALUES (?, ?, 'enrolment_rejected', ?, '[]', ?, ?)
    `).bind(
      `activity_${crypto.randomUUID()}`, request.shelter_id || null,
      actorEmail, reason.trim().slice(0, 1000), now,
    ),
  ]);
}

export async function revokeStaffAccess(accessId: string, reason: string, actorEmail: string) {
  await ensureParticipationSchema();
  if (!reason.trim()) throw new Error("A revocation reason is required.");
  const access = await env.DB.prepare(`
    SELECT shelter_id FROM shelter_staff_access WHERE id = ? AND status = 'active'
  `).bind(accessId).first<Row>();
  if (!access) throw new Error("This access grant is no longer active.");
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE shelter_staff_access SET status = 'revoked', updated_at = ? WHERE id = ?
    `).bind(now, accessId),
    env.DB.prepare(`
      INSERT INTO directory_review_activity (
        id, shelter_id, action, actor_email, changed_fields_json, reason, created_at
      ) VALUES (?, ?, 'staff_access_revoked', ?, ?, ?, ?)
    `).bind(
      `activity_${crypto.randomUUID()}`, access.shelter_id, actorEmail,
      JSON.stringify(["staff_access"]), reason.trim().slice(0, 1000), now,
    ),
  ]);
}
