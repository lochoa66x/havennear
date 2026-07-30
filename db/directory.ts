import { env } from "cloudflare:workers";
import type { PublicShelter, ShelterStatus } from "../app/directory-types";
import { montrealSeedShelters } from "./seed-shelters";
import { assessShelterScope, assertShelterInScope } from "./shelter-scope-policy";

type DirectoryRow = Record<string, unknown>;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS shelters (
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
    scope_state TEXT NOT NULL DEFAULT 'unreviewed',
    availability_status TEXT NOT NULL DEFAULT 'call',
    spaces_available INTEGER,
    availability_updated_at INTEGER,
    availability_expires_at INTEGER,
    note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS shelter_sources (
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
  )`,
  `CREATE TABLE IF NOT EXISTS shelter_external_identifiers (
    id TEXT PRIMARY KEY NOT NULL,
    shelter_id TEXT NOT NULL,
    source_system TEXT NOT NULL,
    external_id TEXT NOT NULL,
    source_version TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS shelter_external_source_id_idx
    ON shelter_external_identifiers(source_system, external_id)`,
  `CREATE TABLE IF NOT EXISTS directory_import_batches (
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
  )`,
  `CREATE TABLE IF NOT EXISTS directory_staging_records (
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
  )`,
  `CREATE TABLE IF NOT EXISTS directory_review_activity (
    id TEXT PRIMARY KEY NOT NULL,
    shelter_id TEXT,
    staging_record_id TEXT,
    action TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    changed_fields_json TEXT NOT NULL DEFAULT '[]',
    reason TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS shelters_public_location_idx ON shelters(publication_state, province_code, city)`,
  `CREATE INDEX IF NOT EXISTS staging_review_idx ON directory_staging_records(review_state, created_at)`,
  `CREATE INDEX IF NOT EXISTS review_activity_created_idx ON directory_review_activity(created_at)`,
];

const jsonArray = (value: unknown): string[] => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const iso = (value: unknown) => typeof value === "number" && value > 0 ? new Date(value).toISOString() : undefined;
const text = (value: unknown) => typeof value === "string" ? value : "";
const numberOrUndefined = (value: unknown) => typeof value === "number" ? value : undefined;

export async function ensureDirectorySchema() {
  await env.DB.batch(schemaStatements.map((statement) => env.DB.prepare(statement)));
}

export async function ensureMontrealSeed() {
  const now = Date.now();
  const statements = [];

  for (const shelter of montrealSeedShelters) {
    if (!assessShelterScope(shelter).eligible) continue;
    statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO shelters (
        id, slug, name, shelter_type, address, city, province_code, country_code,
        latitude, longitude, confidential_address, phone, phone_display, website,
        hours, intake, groups_json, services_json, accessibility_json, languages_json,
        participation_state, publication_state, scope_state, availability_status, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 'eligible_general', ?, ?, ?, ?)
    `).bind(
      shelter.id, shelter.id, shelter.name, shelter.shelterType, shelter.address,
      shelter.city, shelter.provinceCode, shelter.countryCode,
      shelter.latitude ?? null, shelter.longitude ?? null, shelter.confidentialAddress ? 1 : 0,
      shelter.phone, shelter.phoneDisplay, shelter.sourceUrl, shelter.hours, shelter.intake,
      JSON.stringify(shelter.groups), JSON.stringify(shelter.services),
      JSON.stringify(shelter.accessibility), JSON.stringify(shelter.languages),
      shelter.participation, shelter.status, shelter.note, now, now,
    ));
    statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO shelter_sources (
        id, shelter_id, source_organization, title, url, source_type,
        retrieved_at, verified_at, fields_supported_json, status
      ) VALUES (?, ?, ?, ?, ?, 'official_website', ?, ?, ?, 'active')
    `).bind(
      `source_${shelter.id}`, shelter.id, shelter.sourceLabel,
      `${shelter.name} official service information`, shelter.sourceUrl,
      Date.parse(`${shelter.sourceCheckedAt}T12:00:00Z`),
      Date.parse(`${shelter.sourceCheckedAt}T12:00:00Z`),
      JSON.stringify(["name", "contact", "address", "hours", "intake", "groups", "services"]),
    ));
  }

  await env.DB.batch(statements);
}

function toPublicShelter(row: DirectoryRow): PublicShelter {
  const confidential = row.confidential_address === 1;
  const expiresAt = numberOrUndefined(row.availability_expires_at);
  const isFresh = expiresAt !== undefined && expiresAt > Date.now();
  const storedStatus = text(row.availability_status) as ShelterStatus;
  const status: ShelterStatus = isFresh && ["available", "limited", "full"].includes(storedStatus)
    ? storedStatus
    : "call";
  const statusLabels: Record<ShelterStatus, string> = {
    available: "Space reported available",
    limited: "Limited space reported",
    full: "Reported full",
    call: confidential ? "Call for space and location" : "Call to confirm space",
  };

  return {
    id: text(row.id),
    name: text(row.name),
    shelterType: text(row.shelter_type) || "Emergency shelter",
    address: confidential ? "Confidential location — call for directions" : text(row.address),
    city: text(row.city),
    provinceCode: text(row.province_code),
    countryCode: "CA",
    ...(confidential ? {} : {
      ...(typeof row.latitude === "number" ? { latitude: row.latitude } : {}),
      ...(typeof row.longitude === "number" ? { longitude: row.longitude } : {}),
    }),
    phone: text(row.phone),
    phoneDisplay: text(row.phone_display),
    participation: row.participation_state === "participating" ? "participating" : "directory",
    status,
    statusLabel: statusLabels[status],
    ...(status !== "call" && typeof row.spaces_available === "number" ? { spacesAvailable: row.spaces_available } : {}),
    ...(status !== "call" && iso(row.availability_updated_at) ? { availabilityUpdatedAt: iso(row.availability_updated_at) } : {}),
    ...(status !== "call" && iso(row.availability_expires_at) ? { availabilityExpiresAt: iso(row.availability_expires_at) } : {}),
    hours: text(row.hours),
    intake: text(row.intake),
    groups: jsonArray(row.groups_json),
    services: jsonArray(row.services_json),
    accessibility: jsonArray(row.accessibility_json),
    languages: jsonArray(row.languages_json),
    note: text(row.note),
    sourceUrl: text(row.source_url),
    sourceLabel: text(row.source_organization),
    sourceCheckedAt: iso(row.verified_at)?.slice(0, 10) ?? "Verification pending",
    confidentialAddress: confidential,
  };
}

export async function listPublishedShelters(options: {
  province?: string;
  city?: string;
  page?: number;
  limit?: number;
} = {}) {
  await ensureDirectorySchema();
  await ensureMontrealSeed();

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(200, Math.max(1, options.limit ?? 50));
  const clauses = ["s.publication_state = 'published'", "s.scope_state = 'eligible_general'"];
  const bindings: unknown[] = [];
  if (options.province) {
    clauses.push("s.province_code = ?");
    bindings.push(options.province.toUpperCase());
  }
  if (options.city) {
    clauses.push("LOWER(s.city) = LOWER(?)");
    bindings.push(options.city);
  }
  const where = clauses.join(" AND ");
  const [count, result, federalCoverage] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total FROM shelters s WHERE ${where}`)
      .bind(...bindings).first<{ total: number }>(),
    env.DB.prepare(`
      SELECT s.*, src.source_organization, src.url AS source_url, src.verified_at
      FROM shelters s
      LEFT JOIN shelter_sources src ON src.id = (
        SELECT id FROM shelter_sources WHERE shelter_id = s.id AND status = 'active'
        ORDER BY COALESCE(verified_at, retrieved_at) DESC LIMIT 1
      )
      WHERE ${where}
      ORDER BY s.city COLLATE NOCASE, s.name COLLATE NOCASE
      LIMIT ? OFFSET ?
    `).bind(...bindings, limit, (page - 1) * limit).all<DirectoryRow>(),
    env.DB.prepare(`
      SELECT total_rows FROM directory_import_batches WHERE id = 'batch_nspl_2024'
    `).first<{ total_rows: number }>(),
  ]);

  return {
    shelters: result.results.map(toPublicShelter),
    page,
    limit,
    total: count?.total ?? 0,
    coverage: {
      published: count?.total ?? 0,
      federalCandidates: federalCoverage?.total_rows ?? 0,
      provincesAndTerritories: federalCoverage ? 13 : 0,
      sourceLabel: "Government of Canada NSPL",
      sourceYear: 2024,
    },
  };
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const character = csv[i];
    if (character === '"') {
      if (quoted && csv[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && csv[i + 1] === "\n") i += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) throw new Error("The CSV needs a header and at least one shelter row.");
  const headers = rows[0].map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

const firstValue = (row: Record<string, string>, keys: string[]) =>
  keys.map((key) => row[key]?.trim()).find(Boolean) ?? "";
const splitList = (value: string) => value.split(/[|;]/).map((item) => item.trim()).filter(Boolean);
const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

async function duplicateCandidates(parsed: Record<string, unknown>) {
  const existing = await env.DB.prepare(`
    SELECT id, name, city, province_code, phone, address, website FROM shelters
  `).all<DirectoryRow>();
  const name = normalize(text(parsed.name));
  const city = normalize(text(parsed.city));
  const phone = normalize(text(parsed.phone));
  const address = normalize(text(parsed.address));
  return existing.results.filter((candidate) =>
    (name && city && normalize(text(candidate.name)) === name && normalize(text(candidate.city)) === city) ||
    (phone && normalize(text(candidate.phone)) === phone) ||
    (address && normalize(text(candidate.address)) === address),
  ).slice(0, 5).map((candidate) => ({ id: candidate.id, name: candidate.name, city: candidate.city }));
}

export async function importShelterCsv(input: {
  csv: string;
  fileName: string;
  datasetName: string;
  publisher: string;
  sourceUrl: string;
  licence?: string;
  actorEmail: string;
}) {
  await ensureDirectorySchema();
  if (!input.datasetName.trim() || !input.publisher.trim() || !input.sourceUrl.trim()) {
    throw new Error("Dataset name, publisher and source URL are required.");
  }
  if (input.csv.length > 1_000_000) throw new Error("The CSV is larger than the 1 MB pilot limit.");
  const rows = parseCsv(input.csv);
  if (rows.length > 500) throw new Error("Please import no more than 500 rows at a time.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.csv));
  const checksum = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const batchId = `batch_${crypto.randomUUID()}`;
  const now = Date.now();
  const statements = [];
  let validRows = 0;
  let duplicateCount = 0;

  for (const row of rows) {
    const parsed = {
      name: firstValue(row, ["name", "shelter_name", "organization_name"]),
      shelterType: firstValue(row, ["shelter_type", "type"]) || "Emergency shelter",
      address: firstValue(row, ["address", "street_address"]),
      city: firstValue(row, ["city", "municipality"]),
      provinceCode: firstValue(row, ["province_code", "province", "territory"]).toUpperCase(),
      postalCode: firstValue(row, ["postal_code", "postal"]),
      phone: firstValue(row, ["phone", "telephone"]),
      phoneDisplay: firstValue(row, ["phone_display", "phone", "telephone"]),
      website: firstValue(row, ["website", "url"]),
      hours: firstValue(row, ["hours", "opening_hours"]),
      intake: firstValue(row, ["intake", "eligibility", "admission"]),
      groups: splitList(firstValue(row, ["groups", "populations", "who_can_stay"])),
      services: splitList(firstValue(row, ["services"])),
      confidentialAddress: ["true", "yes", "1"].includes(firstValue(row, ["confidential_address"]).toLowerCase()),
      genderServed: firstValue(row, ["gender_served", "gender"]),
      targetClientele: firstValue(row, ["target_clientele", "clientele"]),
      umbrellaOrganization: firstValue(row, ["umbrella_organization", "organization"]),
      scopeConfirmed: false,
    };
    const warnings = [];
    if (!parsed.name) warnings.push("Missing shelter name");
    if (!parsed.city) warnings.push("Missing city");
    if (!parsed.provinceCode) warnings.push("Missing province or territory");
    if (!parsed.phone) warnings.push("Missing public phone");
    if (!parsed.confidentialAddress && !parsed.address) warnings.push("Missing public address");
    if (!parsed.hours) warnings.push("Missing hours");
    if (!parsed.intake) warnings.push("Missing intake guidance");
    const scope = assessShelterScope(parsed);
    if (!scope.eligible) warnings.push(...scope.reasons.map((reason) => `Excluded by safety scope: ${reason}`));
    const duplicates = await duplicateCandidates(parsed);
    if (duplicates.length) duplicateCount += 1;
    const reviewState = scope.eligible ? "pending" : "excluded_sensitive";
    if (!warnings.length && scope.eligible) validRows += 1;
    statements.push(env.DB.prepare(`
      INSERT INTO directory_staging_records (
        id, batch_id, source_row_json, parsed_json, validation_warnings_json,
        duplicate_candidates_json, review_state, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `stage_${crypto.randomUUID()}`, batchId, JSON.stringify(row), JSON.stringify(parsed),
      JSON.stringify(warnings), JSON.stringify(duplicates), reviewState, now,
    ));
  }

  statements.unshift(env.DB.prepare(`
    INSERT INTO directory_import_batches (
      id, dataset_name, publisher, source_url, licence, file_name, checksum,
      imported_at, total_rows, accepted_rows, duplicate_candidates, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    batchId, input.datasetName, input.publisher, input.sourceUrl, input.licence || null,
    input.fileName, checksum, now, rows.length, validRows, duplicateCount, input.actorEmail,
  ));
  await env.DB.batch(statements);
  return { batchId, totalRows: rows.length, readyForReview: validRows, duplicateCandidates: duplicateCount };
}

async function audit(actorEmail: string, action: string, options: {
  shelterId?: string;
  stagingRecordId?: string;
  fields?: string[];
  reason?: string;
}) {
  await env.DB.prepare(`
    INSERT INTO directory_review_activity (
      id, shelter_id, staging_record_id, action, actor_email, changed_fields_json, reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    `activity_${crypto.randomUUID()}`, options.shelterId || null, options.stagingRecordId || null,
    action, actorEmail, JSON.stringify(options.fields ?? []), options.reason ?? "", Date.now(),
  ).run();
}

export async function updateStagingRecord(id: string, parsed: Record<string, unknown>, notes: string, actorEmail: string) {
  const allowed = [
    "name", "shelterType", "address", "city", "provinceCode", "postalCode",
    "phone", "phoneDisplay", "website", "hours", "intake", "groups", "services",
    "confidentialAddress", "totalBeds", "federalServiceProviderId",
    "umbrellaOrganization", "targetClientele", "genderServed", "sourceYear", "scopeConfirmed",
  ];
  const clean = Object.fromEntries(allowed.filter((key) => key in parsed).map((key) => [key, parsed[key]]));
  const scope = assessShelterScope(clean);
  const reviewState = scope.eligible ? "pending" : "excluded_sensitive";
  await env.DB.prepare(`
    UPDATE directory_staging_records
    SET parsed_json = ?, reviewer_notes = ?, review_state = ?, reviewed_at = ?
    WHERE id = ? AND review_state = 'pending'
  `).bind(
    JSON.stringify(clean),
    notes.slice(0, 1000),
    reviewState,
    reviewState === "pending" ? null : Date.now(),
    id,
  ).run();
  await audit(actorEmail, "staging_corrected", { stagingRecordId: id, fields: Object.keys(clean) });
}

async function getStage(id: string) {
  const stage = await env.DB.prepare(`SELECT * FROM directory_staging_records WHERE id = ?`).bind(id).first<DirectoryRow>();
  if (!stage || stage.review_state !== "pending") throw new Error("This staging record is no longer pending.");
  return { ...stage, parsed: JSON.parse(text(stage.parsed_json)) as Record<string, unknown> };
}

async function sourceForStage(stage: DirectoryRow & { parsed: Record<string, unknown> }, shelterId: string) {
  const batch = await env.DB.prepare(`
    SELECT * FROM directory_import_batches WHERE id = ?
  `).bind(stage.batch_id).first<DirectoryRow>();
  if (!batch) return [];
  const sourceId = `source_${crypto.randomUUID()}`;
  const statements = [env.DB.prepare(`
    INSERT INTO shelter_sources (
      id, shelter_id, staging_record_id, source_organization, title, url,
      source_type, licence, retrieved_at, fields_supported_json, status
    ) VALUES (?, ?, ?, ?, ?, ?, 'directory_import', ?, ?, ?, 'active')
  `).bind(
    sourceId, shelterId, stage.id, batch.publisher, batch.dataset_name, batch.source_url,
    batch.licence || null, batch.imported_at, JSON.stringify(Object.keys(stage.parsed)),
  )];
  const federalId = text(stage.parsed.federalServiceProviderId);
  if (federalId) {
    statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO shelter_external_identifiers (
        id, shelter_id, source_system, external_id, source_version, created_at
      ) VALUES (?, ?, 'ca_hicc_nspl', ?, ?, ?)
    `).bind(
      `external_nspl_${federalId}`, shelterId, federalId,
      text(stage.parsed.sourceYear) || text(batch.dataset_version), Date.now(),
    ));
  }
  return statements;
}

function shelterBindings(id: string, parsed: Record<string, unknown>, now: number) {
  const name = text(parsed.name).trim();
  const city = text(parsed.city).trim();
  const province = text(parsed.provinceCode).trim().toUpperCase();
  const phone = text(parsed.phone).trim();
  if (!name || !city || !province || !phone) throw new Error("Name, city, province and phone are required before approval.");
  return [
    id, id, name, text(parsed.shelterType) || "Emergency shelter",
    text(parsed.address) || null, city, province, text(parsed.postalCode) || null,
    parsed.confidentialAddress ? 1 : 0, phone, text(parsed.phoneDisplay) || phone,
    text(parsed.website) || null, text(parsed.hours) || "Call for current hours",
    text(parsed.intake) || "Call before travelling",
    JSON.stringify(Array.isArray(parsed.groups) ? parsed.groups : []),
    JSON.stringify(Array.isArray(parsed.services) ? parsed.services : []),
    typeof parsed.totalBeds === "number" ? parsed.totalBeds : null,
    now, now,
  ];
}

export async function approveStagingRecord(id: string, actorEmail: string) {
  const stage = await getStage(id);
  assertShelterInScope(stage.parsed, { requireConfirmation: true });
  const shelterId = `shelter_${crypto.randomUUID()}`;
  const now = Date.now();
  const sourceStatements = await sourceForStage(stage, shelterId);
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO shelters (
        id, slug, name, shelter_type, address, city, province_code, postal_code,
        confidential_address, phone, phone_display, website, hours, intake,
        groups_json, services_json, total_beds, publication_state, scope_state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'eligible_general', ?, ?)
    `).bind(...shelterBindings(shelterId, stage.parsed, now)),
    env.DB.prepare(`
      UPDATE directory_staging_records
      SET review_state = 'approved', approved_shelter_id = ?, reviewed_at = ? WHERE id = ?
    `).bind(shelterId, now, id),
    ...sourceStatements,
  ]);
  await audit(actorEmail, "approved_for_publication", { shelterId, stagingRecordId: id, fields: Object.keys(stage.parsed) });
  return shelterId;
}

export async function mergeStagingRecord(id: string, shelterId: string, actorEmail: string) {
  const stage = await getStage(id);
  assertShelterInScope(stage.parsed, { requireConfirmation: true });
  const now = Date.now();
  const values = shelterBindings(shelterId, stage.parsed, now);
  const sourceStatements = await sourceForStage(stage, shelterId);
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE shelters SET
        name = ?, shelter_type = ?, address = ?, city = ?, province_code = ?, postal_code = ?,
        confidential_address = ?, phone = ?, phone_display = ?, website = ?, hours = ?, intake = ?,
        groups_json = ?, services_json = ?, total_beds = ?, scope_state = 'eligible_general', updated_at = ?
      WHERE id = ?
    `).bind(...values.slice(2, 17), now, shelterId),
    env.DB.prepare(`
      UPDATE directory_staging_records
      SET review_state = 'merged', approved_shelter_id = ?, reviewed_at = ? WHERE id = ?
    `).bind(shelterId, now, id),
    ...sourceStatements,
  ]);
  await audit(actorEmail, "merged", { shelterId, stagingRecordId: id, fields: Object.keys(stage.parsed) });
}

export async function rejectStagingRecord(id: string, reason: string, actorEmail: string) {
  await env.DB.prepare(`
    UPDATE directory_staging_records SET review_state = 'rejected', reviewer_notes = ?, reviewed_at = ?
    WHERE id = ? AND review_state = 'pending'
  `).bind(reason.slice(0, 1000), Date.now(), id).run();
  await audit(actorEmail, "rejected", { stagingRecordId: id, reason });
}

export async function publishShelter(id: string, actorEmail: string) {
  const shelter = await env.DB.prepare(`SELECT * FROM shelters WHERE id = ?`).bind(id).first<DirectoryRow>();
  if (!shelter || shelter.publication_state !== "approved") throw new Error("This shelter is not ready to publish.");
  assertShelterInScope({
    name: shelter.name,
    shelterType: shelter.shelter_type,
    address: shelter.address,
    phone: shelter.phone,
    website: shelter.website,
    intake: shelter.intake,
    groups: jsonArray(shelter.groups_json),
    services: jsonArray(shelter.services_json),
    confidentialAddress: shelter.confidential_address === 1,
    scopeConfirmed: shelter.scope_state === "eligible_general",
  }, { requireConfirmation: true });
  await env.DB.prepare(`
    UPDATE shelters SET publication_state = 'published', updated_at = ?
    WHERE id = ? AND publication_state = 'approved' AND scope_state = 'eligible_general'
  `).bind(Date.now(), id).run();
  await audit(actorEmail, "published", { shelterId: id, fields: ["publication_state"] });
}

export async function archiveShelter(id: string, reason: string, actorEmail: string) {
  await env.DB.prepare(`
    UPDATE shelters SET publication_state = 'archived', updated_at = ? WHERE id = ?
  `).bind(Date.now(), id).run();
  await audit(actorEmail, "archived", { shelterId: id, fields: ["publication_state"], reason });
}

export async function getDirectoryReviewDashboard(options: {
  search?: string;
  province?: string;
  shelterType?: string;
  focus?: string;
  page?: number;
  limit?: number;
} = {}) {
  await ensureDirectorySchema();
  await ensureMontrealSeed();
  const search = (options.search || "").trim().slice(0, 120);
  const province = (options.province || "").trim().toUpperCase().slice(0, 2);
  const shelterType = (options.shelterType || "").trim().toLowerCase();
  const focus = (options.focus || "").trim().toLowerCase();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(10, options.limit || 25));
  const clauses = ["review_state = 'pending'"];
  const bindings: unknown[] = [];
  if (search) {
    clauses.push(`(
      LOWER(json_extract(parsed_json, '$.name')) LIKE ? OR
      LOWER(json_extract(parsed_json, '$.city')) LIKE ? OR
      LOWER(json_extract(parsed_json, '$.umbrellaOrganization')) LIKE ? OR
      CAST(json_extract(parsed_json, '$.federalServiceProviderId') AS TEXT) = ?
    )`);
    const pattern = `%${search.toLowerCase()}%`;
    bindings.push(pattern, pattern, pattern, search);
  }
  if (province) {
    clauses.push(`UPPER(json_extract(parsed_json, '$.provinceCode')) = ?`);
    bindings.push(province);
  }
  if (shelterType === "emergency") {
    clauses.push(`LOWER(json_extract(parsed_json, '$.shelterType')) LIKE '%emergency%'`);
  } else if (shelterType === "transitional") {
    clauses.push(`LOWER(json_extract(parsed_json, '$.shelterType')) LIKE '%transitional%'`);
  }
  const fieldValue = (field: string) => `TRIM(COALESCE(json_extract(parsed_json, '$.${field}'), ''))`;
  if (focus === "duplicates") {
    clauses.push(`duplicate_candidates_json != '[]'`);
  } else if (focus === "missing_phone") {
    clauses.push(`${fieldValue("phone")} = ''`);
  } else if (focus === "missing_location") {
    clauses.push(`COALESCE(json_extract(parsed_json, '$.confidentialAddress'), 0) != 1 AND ${fieldValue("address")} = ''`);
  } else if (focus === "missing_hours") {
    clauses.push(`${fieldValue("hours")} = ''`);
  } else if (focus === "missing_intake") {
    clauses.push(`${fieldValue("intake")} = ''`);
  } else if (focus === "core_complete") {
    clauses.push(`${fieldValue("phone")} != ''`);
    clauses.push(`${fieldValue("hours")} != ''`);
    clauses.push(`${fieldValue("intake")} != ''`);
    clauses.push(`(COALESCE(json_extract(parsed_json, '$.confidentialAddress'), 0) = 1 OR ${fieldValue("address")} != '')`);
  }
  const stagingWhere = clauses.join(" AND ");

  const [counts, filteredCount, batches, staging, shelters, activity] = await Promise.all([
    env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM shelters WHERE publication_state = 'published') AS published,
        (SELECT COUNT(*) FROM shelters WHERE publication_state = 'approved') AS approved,
        (SELECT COUNT(*) FROM directory_staging_records WHERE review_state = 'pending') AS pending,
        (
          SELECT COUNT(*) FROM directory_staging_records stage
          WHERE stage.review_state = 'pending' AND (
            stage.duplicate_candidates_json != '[]' OR EXISTS (
              SELECT 1 FROM shelters s
              WHERE LOWER(s.name) = LOWER(json_extract(stage.parsed_json, '$.name'))
                AND LOWER(s.city) = LOWER(json_extract(stage.parsed_json, '$.city'))
            )
          )
        ) AS duplicates
    `).first<DirectoryRow>(),
    env.DB.prepare(`
      SELECT COUNT(*) AS total FROM directory_staging_records WHERE ${stagingWhere}
    `).bind(...bindings).first<{ total: number }>(),
    env.DB.prepare(`SELECT * FROM directory_import_batches ORDER BY imported_at DESC LIMIT 20`).all<DirectoryRow>(),
    env.DB.prepare(`
      SELECT * FROM directory_staging_records
      WHERE ${stagingWhere}
      ORDER BY
        CASE WHEN batch_id = 'batch_nspl_2024' THEN 1 ELSE 0 END,
        LOWER(json_extract(parsed_json, '$.provinceCode')),
        LOWER(json_extract(parsed_json, '$.city')),
        LOWER(json_extract(parsed_json, '$.name'))
      LIMIT ? OFFSET ?
    `).bind(...bindings, limit, (page - 1) * limit).all<DirectoryRow>(),
    env.DB.prepare(`
      SELECT id, name, city, province_code, phone, publication_state, confidential_address, updated_at
      FROM shelters ORDER BY name COLLATE NOCASE
    `).all<DirectoryRow>(),
    env.DB.prepare(`SELECT * FROM directory_review_activity ORDER BY created_at DESC LIMIT 50`).all<DirectoryRow>(),
  ]);
  const shelterRows = shelters.results;
  return {
    counts: counts ?? { published: 0, approved: 0, pending: 0, duplicates: 0 },
    batches: batches.results,
    staging: staging.results.map((row) => ({
      ...row,
      parsed: JSON.parse(text(row.parsed_json)),
      warnings: jsonArray(row.validation_warnings_json),
      duplicateCandidates: (() => {
        const stored = JSON.parse(text(row.duplicate_candidates_json) || "[]") as unknown[];
        if (stored.length) return stored;
        const parsed = JSON.parse(text(row.parsed_json)) as Record<string, unknown>;
        const name = normalize(text(parsed.name));
        const city = normalize(text(parsed.city));
        const phone = normalize(text(parsed.phone));
        return shelterRows.filter((candidate) =>
          (name && city && normalize(text(candidate.name)) === name && normalize(text(candidate.city)) === city) ||
          (phone && normalize(text(candidate.phone)) === phone),
        ).slice(0, 5).map((candidate) => ({
          id: candidate.id, name: candidate.name, city: candidate.city,
        }));
      })(),
    })),
    shelters: shelterRows,
    activity: activity.results,
    review: {
      page,
      limit,
      filtered: filteredCount?.total ?? 0,
      totalPages: Math.max(1, Math.ceil((filteredCount?.total ?? 0) / limit)),
      search,
      province,
      shelterType,
      focus,
    },
  };
}
