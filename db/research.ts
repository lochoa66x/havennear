import { env } from "cloudflare:workers";
import { ensureDirectorySchema } from "./directory";
import { assessShelterScope, assertShelterInScope } from "./shelter-scope-policy";
import { bestResearchMatch, MATCHER_VERSION } from "./research-matcher.js";
import { torontoResearchPilot, type TorontoResearchSeed } from "./toronto-research-seed";
import { torontoVerificationSeeds } from "./toronto-verification-seed";

type Row = Record<string, unknown>;

const TORONTO_BATCH_ID = "research_toronto_20260729_general25_v2";
const TORONTO_DATASET_URL = "https://open.toronto.ca/dataset/daily-shelter-overnight-service-occupancy-capacity/";
const TORONTO_RESOURCE_URL = "https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/21c83b32-d5a8-4106-a54f-010dbe49f6f2/resource/ffd20867-6e3c-4074-8427-d63810edf231/download/daily-shelter-overnight-occupancy.csv";
const TORONTO_LICENCE = "Open Government Licence – Toronto";
const TORONTO_LICENCE_URL = "https://open.toronto.ca/open-data-licence/";
const SNAPSHOT_DATE = "2026-07-29";
const SNAPSHOT_TIME = Date.parse("2026-07-29T20:00:00Z");

const researchSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS research_batches (
    id TEXT PRIMARY KEY NOT NULL,
    dataset_name TEXT NOT NULL,
    publisher TEXT NOT NULL,
    dataset_version TEXT NOT NULL,
    source_url TEXT NOT NULL,
    licence TEXT NOT NULL,
    licence_url TEXT NOT NULL,
    retrieved_at INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    run_limit INTEGER NOT NULL,
    scale_target INTEGER NOT NULL DEFAULT 100,
    total_rows INTEGER NOT NULL DEFAULT 0,
    exact_matches INTEGER NOT NULL DEFAULT 0,
    probable_matches INTEGER NOT NULL DEFAULT 0,
    ambiguous_matches INTEGER NOT NULL DEFAULT 0,
    unmatched_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pilot',
    publication_guard TEXT NOT NULL DEFAULT 'private_review_only',
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS research_candidates (
    id TEXT PRIMARY KEY NOT NULL,
    batch_id TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    source_row_json TEXT NOT NULL,
    proposed_changes_json TEXT NOT NULL,
    matched_staging_record_id TEXT,
    matched_shelter_id TEXT,
    match_state TEXT NOT NULL DEFAULT 'unmatched',
    match_score REAL NOT NULL DEFAULT 0,
    match_explanation TEXT NOT NULL DEFAULT '',
    privacy_flags_json TEXT NOT NULL DEFAULT '[]',
    review_state TEXT NOT NULL DEFAULT 'pending',
    review_outcome TEXT,
    reviewer_notes TEXT NOT NULL DEFAULT '',
    privacy_cleared INTEGER NOT NULL DEFAULT 0,
    verification_json TEXT NOT NULL DEFAULT '{}',
    verification_checks_json TEXT NOT NULL DEFAULT '{}',
    verification_state TEXT NOT NULL DEFAULT 'unstarted',
    directory_ready INTEGER NOT NULL DEFAULT 0,
    reviewed_by TEXT,
    reviewed_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS research_candidate_citations (
    id TEXT PRIMARY KEY NOT NULL,
    candidate_id TEXT NOT NULL,
    publisher TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    licence TEXT NOT NULL,
    licence_url TEXT NOT NULL,
    retrieved_at INTEGER NOT NULL,
    source_version TEXT NOT NULL,
    fields_supported_json TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS research_source_record_idx
    ON research_candidates(batch_id, source_record_id)`,
  `CREATE INDEX IF NOT EXISTS research_match_review_idx
    ON research_candidates(batch_id, match_state, review_state)`,
  `CREATE INDEX IF NOT EXISTS research_citation_candidate_idx
    ON research_candidate_citations(candidate_id)`,
];

const stringValue = (value: unknown) => typeof value === "string" ? value : "";
const parseObject = (value: unknown) => {
  try {
    const parsed = JSON.parse(stringValue(value));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
};
const parseList = (value: unknown) => {
  try {
    const parsed = JSON.parse(stringValue(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
function bestMatch(source: TorontoResearchSeed, staging: Row[], shelters: Row[]) {
  const candidates: Array<Record<string, string>> = [];

  for (const row of staging) {
    const parsed = parseObject(row.parsed_json);
    if (!assessShelterScope(parsed).eligible) continue;
    candidates.push({
      id: stringValue(row.id),
      name: stringValue(parsed.name),
      organization: stringValue(parsed.umbrellaOrganization),
      city: stringValue(parsed.city),
      province: stringValue(parsed.provinceCode),
      shelterType: stringValue(parsed.shelterType),
      address: stringValue(parsed.address),
      postalCode: stringValue(parsed.postalCode),
    });
  }

  for (const row of shelters) {
    candidates.push({
      id: stringValue(row.id),
      shelterId: stringValue(row.id),
      name: stringValue(row.name),
      city: stringValue(row.city),
      province: stringValue(row.province_code),
      shelterType: stringValue(row.shelter_type),
      address: stringValue(row.address),
      postalCode: stringValue(row.postal_code),
    });
  }

  return bestResearchMatch(source, candidates);
}

function proposedChanges(source: TorontoResearchSeed) {
  return {
    name: source.name,
    alternateNames: [source.group, source.org].filter((value, index, values) => value && values.indexOf(value) === index),
    address: source.address,
    postalCode: source.postalCode,
    city: source.city,
    provinceCode: source.province,
    shelterType: source.models.join(" / "),
    groups: source.sectors,
    services: source.types,
    scopeConfirmed: false,
  };
}

function privacyFlags(source: TorontoResearchSeed) {
  return [
    "Address requires independent confirmation before any directory change.",
    "Source capacity and occupancy were intentionally excluded; this is not live availability.",
    ...(source.types.some((item) => /hotel|motel/i.test(item))
      ? ["Temporary hotel/motel location: confirm that publishing the address is safe and current."]
      : []),
  ];
}

export async function ensureResearchSchema() {
  await env.DB.batch(researchSchemaStatements.map((statement) => env.DB.prepare(statement)));
}

async function checksum(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ensurePhase5BVerificationSeeds() {
  const statements = [];
  for (const seed of torontoVerificationSeeds) {
    const candidateId = `research_toronto_${SNAPSHOT_DATE.replaceAll("-", "")}_v2_${seed.sourceRecordId}`;
    const verification = {
      ...(seed.suggested ?? {}),
      officialSourceUrl: seed.url,
      officialSourceTitle: seed.title,
      officialSourcePublisher: seed.publisher,
      fieldsSupported: seed.fieldsSupported,
    };
    const excluded = Boolean(seed.exclusionReason);
    statements.push(env.DB.prepare(`
      UPDATE research_candidates
      SET verification_json = CASE WHEN verification_state = 'unstarted' THEN ? ELSE verification_json END,
          verification_state = CASE WHEN ? = 1 THEN 'excluded_sensitive'
            WHEN verification_state = 'unstarted' THEN 'researching' ELSE verification_state END,
          review_state = CASE WHEN ? = 1 THEN 'excluded_sensitive' ELSE review_state END,
          directory_ready = CASE WHEN ? = 1 THEN 0 ELSE directory_ready END,
          reviewer_notes = CASE WHEN ? = 1 AND reviewer_notes = '' THEN ? ELSE reviewer_notes END
      WHERE id = ? AND batch_id = ?
    `).bind(
      JSON.stringify(verification),
      excluded ? 1 : 0,
      excluded ? 1 : 0,
      excluded ? 1 : 0,
      excluded ? 1 : 0,
      seed.exclusionReason ?? "",
      candidateId,
      TORONTO_BATCH_ID,
    ));
    statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO research_candidate_citations (
        id, candidate_id, publisher, title, url, licence, licence_url,
        retrieved_at, source_version, fields_supported_json
      ) VALUES (?, ?, ?, ?, ?, 'Public website facts – verification use only', ?, ?, '2026-07-30', ?)
    `).bind(
      `verification_${candidateId}`,
      candidateId,
      seed.publisher,
      seed.title,
      seed.url,
      seed.url,
      Date.parse("2026-07-30T16:00:00Z"),
      JSON.stringify(seed.fieldsSupported),
    ));
  }
  await env.DB.batch(statements);
}

async function refreshPhase5B2Matches() {
  const stale = await env.DB.prepare(`
    SELECT COUNT(*) AS total FROM research_candidates
    WHERE batch_id = ? AND match_explanation NOT LIKE ?
  `).bind(TORONTO_BATCH_ID, `${MATCHER_VERSION}%`).first<{ total: number }>();
  if (!Number(stale?.total || 0)) return;

  const [candidateResult, stagingResult, shelterResult] = await Promise.all([
    env.DB.prepare(`
      SELECT id, source_row_json, match_state, matched_staging_record_id, matched_shelter_id,
        review_state, verification_state
      FROM research_candidates WHERE batch_id = ?
    `).bind(TORONTO_BATCH_ID).all<Row>(),
    env.DB.prepare(`
      SELECT id, parsed_json FROM directory_staging_records
      WHERE review_state = 'pending'
        AND UPPER(COALESCE(json_extract(parsed_json, '$.provinceCode'), '')) = 'ON'
    `).all<Row>(),
    env.DB.prepare(`
      SELECT id, name, city, province_code, shelter_type, address, postal_code
      FROM shelters
      WHERE province_code = 'ON' AND publication_state != 'archived'
    `).all<Row>(),
  ]);

  const statements = [];
  const matchCounts = { exact: 0, probable: 0, ambiguous: 0, unmatched: 0 };
  for (const row of candidateResult.results) {
    const source = parseObject(row.source_row_json) as unknown as TorontoResearchSeed;
    const match = bestMatch(source, stagingResult.results, shelterResult.results);
    matchCounts[match.state as keyof typeof matchCounts] += 1;
    const stagingId = match.match && !match.match.shelterId ? match.match.id : null;
    const shelterId = match.match?.shelterId ?? null;
    const changed = stringValue(row.match_state) !== match.state
      || stringValue(row.matched_staging_record_id) !== (stagingId ?? "")
      || stringValue(row.matched_shelter_id) !== (shelterId ?? "");

    statements.push(env.DB.prepare(`
      UPDATE research_candidates
      SET matched_staging_record_id = ?, matched_shelter_id = ?, match_state = ?,
        match_score = ?, match_explanation = ?,
        review_state = CASE
          WHEN ? = 1 AND review_state = 'reviewed' THEN 'pending'
          ELSE review_state
        END,
        review_outcome = CASE WHEN ? = 1 THEN NULL ELSE review_outcome END,
        directory_ready = CASE WHEN ? = 1 THEN 0 ELSE directory_ready END,
        verification_state = CASE
          WHEN ? = 1 AND verification_state = 'verified' THEN 'researching'
          ELSE verification_state
        END
      WHERE id = ? AND batch_id = ?
    `).bind(
      stagingId,
      shelterId,
      match.state,
      Number(match.score.toFixed(4)),
      match.explanation,
      changed ? 1 : 0,
      changed ? 1 : 0,
      changed ? 1 : 0,
      changed ? 1 : 0,
      row.id,
      TORONTO_BATCH_ID,
    ));
  }
  statements.push(env.DB.prepare(`
    UPDATE research_batches
    SET exact_matches = ?, probable_matches = ?, ambiguous_matches = ?, unmatched_rows = ?
    WHERE id = ?
  `).bind(
    matchCounts.exact,
    matchCounts.probable,
    matchCounts.ambiguous,
    matchCounts.unmatched,
    TORONTO_BATCH_ID,
  ));
  await env.DB.batch(statements);
}

export async function ensureTorontoResearchPilot() {
  await ensureDirectorySchema();
  await ensureResearchSchema();
  const existing = await env.DB.prepare(`SELECT id FROM research_batches WHERE id = ?`)
    .bind(TORONTO_BATCH_ID)
    .first<{ id: string }>();
  if (existing) {
    await ensurePhase5BVerificationSeeds();
    await refreshPhase5B2Matches();
    return;
  }
  for (const source of torontoResearchPilot) {
    assertShelterInScope({
      name: source.name,
      shelterType: [...source.models, ...source.types].join(" "),
      address: source.address,
      groups: source.sectors,
      umbrellaOrganization: source.org,
      sourceText: source.group,
      programs: source.programs,
    });
  }
  if (torontoResearchPilot.length !== 25) {
    throw new Error("The screened Toronto pilot must contain exactly 25 locations.");
  }

  const [stagingResult, shelterResult] = await Promise.all([
    env.DB.prepare(`
      SELECT id, parsed_json FROM directory_staging_records
      WHERE review_state = 'pending'
        AND UPPER(COALESCE(json_extract(parsed_json, '$.provinceCode'), '')) = 'ON'
    `).all<Row>(),
    env.DB.prepare(`
      SELECT id, name, city, province_code, shelter_type, address, postal_code FROM shelters
      WHERE province_code = 'ON' AND publication_state != 'archived'
    `).all<Row>(),
  ]);
  const sourceChecksum = await checksum(JSON.stringify(torontoResearchPilot));
  const candidateStatements = [];
  const citationStatements = [];
  const matchCounts = { exact: 0, probable: 0, ambiguous: 0, unmatched: 0 };

  for (const source of torontoResearchPilot) {
    const candidateId = `research_toronto_${SNAPSHOT_DATE.replaceAll("-", "")}_v2_${source.id}`;
    const match = bestMatch(source, stagingResult.results, shelterResult.results);
    matchCounts[match.state as keyof typeof matchCounts] += 1;
    candidateStatements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO research_candidates (
        id, batch_id, source_record_id, source_row_json, proposed_changes_json,
        matched_staging_record_id, matched_shelter_id, match_state, match_score,
        match_explanation, privacy_flags_json, review_state, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      candidateId,
      TORONTO_BATCH_ID,
      source.id,
      JSON.stringify({ ...source, occupancyDate: SNAPSHOT_DATE }),
      JSON.stringify(proposedChanges(source)),
      match.match && !match.match.shelterId ? match.match.id : null,
      match.match?.shelterId ?? null,
      match.state,
      Number(match.score.toFixed(4)),
      match.explanation,
      JSON.stringify(privacyFlags(source)),
      SNAPSHOT_TIME,
    ));
    citationStatements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO research_candidate_citations (
        id, candidate_id, publisher, title, url, licence, licence_url,
        retrieved_at, source_version, fields_supported_json
      ) VALUES (?, ?, 'City of Toronto', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `citation_${candidateId}`,
      candidateId,
      "Daily Shelter & Overnight Service Occupancy & Capacity",
      TORONTO_RESOURCE_URL,
      TORONTO_LICENCE,
      TORONTO_LICENCE_URL,
      SNAPSHOT_TIME,
      SNAPSHOT_DATE,
      JSON.stringify(["name", "operator", "address", "postalCode", "city", "groups", "shelterType", "services"]),
    ));
  }

  await env.DB.prepare(`
    INSERT OR IGNORE INTO research_batches (
      id, dataset_name, publisher, dataset_version, source_url, licence, licence_url,
      retrieved_at, checksum, run_limit, scale_target, total_rows, exact_matches,
      probable_matches, ambiguous_matches, unmatched_rows, status, publication_guard,
      created_by, created_at
    ) VALUES (?, ?, 'City of Toronto', ?, ?, ?, ?, ?, ?, 25, 100, 25, ?, ?, ?, ?, 'pilot', 'private_review_only', 'system:phase5a-pilot', ?)
  `).bind(
    TORONTO_BATCH_ID,
    "Daily Shelter & Overnight Service Occupancy & Capacity",
    SNAPSHOT_DATE,
    TORONTO_DATASET_URL,
    TORONTO_LICENCE,
    TORONTO_LICENCE_URL,
    SNAPSHOT_TIME,
    sourceChecksum,
    matchCounts.exact,
    matchCounts.probable,
    matchCounts.ambiguous,
    matchCounts.unmatched,
    SNAPSHOT_TIME,
  ).run();
  await env.DB.batch(candidateStatements);
  await env.DB.batch(citationStatements);
  await ensurePhase5BVerificationSeeds();
  await refreshPhase5B2Matches();
}

export async function getResearchDashboard(options: {
  search?: string;
  matchState?: string;
  verificationState?: string;
} = {}) {
  await ensureTorontoResearchPilot();
  const search = (options.search || "").trim().toLowerCase().slice(0, 120);
  const matchState = (options.matchState || "").trim().toLowerCase();
  const verificationState = (options.verificationState || "").trim().toLowerCase();
  const clauses = ["c.batch_id = ?"];
  const bindings: unknown[] = [TORONTO_BATCH_ID];
  if (search) {
    clauses.push(`(
      LOWER(json_extract(c.proposed_changes_json, '$.name')) LIKE ? OR
      LOWER(json_extract(c.source_row_json, '$.org')) LIKE ? OR
      LOWER(json_extract(c.proposed_changes_json, '$.address')) LIKE ?
    )`);
    bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (["exact", "probable", "ambiguous", "unmatched"].includes(matchState)) {
    clauses.push("c.match_state = ?");
    bindings.push(matchState);
  }
  if (["unstarted", "researching", "verified", "excluded_sensitive"].includes(verificationState)) {
    clauses.push("c.verification_state = ?");
    bindings.push(verificationState);
  }

  const [batch, candidatesResult, metrics] = await Promise.all([
    env.DB.prepare(`SELECT * FROM research_batches WHERE id = ?`).bind(TORONTO_BATCH_ID).first<Row>(),
    env.DB.prepare(`
      SELECT c.*, citation.publisher AS citation_publisher, citation.title AS citation_title,
        citation.url AS citation_url, citation.licence AS citation_licence,
        citation.licence_url AS citation_licence_url, citation.retrieved_at AS citation_retrieved_at,
        citation.source_version AS citation_source_version,
        citation.fields_supported_json AS citation_fields_supported_json,
        verification_citation.publisher AS verification_citation_publisher,
        verification_citation.title AS verification_citation_title,
        verification_citation.url AS verification_citation_url,
        verification_citation.retrieved_at AS verification_citation_retrieved_at,
        verification_citation.fields_supported_json AS verification_citation_fields_supported_json,
        stage.parsed_json AS matched_staging_json,
        shelter.name AS matched_shelter_name
      FROM research_candidates c
      LEFT JOIN research_candidate_citations citation ON citation.candidate_id = c.id
        AND citation.id = 'citation_' || c.id
      LEFT JOIN research_candidate_citations verification_citation ON verification_citation.candidate_id = c.id
        AND verification_citation.id = 'verification_' || c.id
      LEFT JOIN directory_staging_records stage ON stage.id = c.matched_staging_record_id
      LEFT JOIN shelters shelter ON shelter.id = c.matched_shelter_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY
        CASE c.match_state WHEN 'ambiguous' THEN 1 WHEN 'probable' THEN 2 WHEN 'unmatched' THEN 3 ELSE 4 END,
        LOWER(json_extract(c.proposed_changes_json, '$.name'))
      LIMIT 100
    `).bind(...bindings).all<Row>(),
    env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN review_state = 'reviewed' THEN 1 ELSE 0 END) AS reviewed,
        SUM(CASE WHEN match_state IN ('exact', 'probable') AND review_state = 'reviewed' THEN 1 ELSE 0 END)
          AS reviewed_confident_matches,
        SUM(CASE WHEN match_state IN ('exact', 'probable') AND review_outcome = 'match_correct' THEN 1 ELSE 0 END)
          AS verified_correct,
        SUM(CASE WHEN match_state IN ('exact', 'probable') AND review_outcome = 'match_incorrect' THEN 1 ELSE 0 END)
          AS verified_incorrect,
        SUM(CASE WHEN privacy_cleared = 1 THEN 1 ELSE 0 END) AS privacy_cleared
        , SUM(CASE WHEN directory_ready = 1 THEN 1 ELSE 0 END) AS directory_ready
        , SUM(CASE WHEN verification_state = 'researching' THEN 1 ELSE 0 END) AS researching
        , SUM(CASE WHEN verification_state = 'excluded_sensitive' THEN 1 ELSE 0 END) AS excluded_sensitive
      FROM research_candidates WHERE batch_id = ?
    `).bind(TORONTO_BATCH_ID).first<Row>(),
  ]);

  const verifiedCorrect = Number(metrics?.verified_correct || 0);
  const verifiedIncorrect = Number(metrics?.verified_incorrect || 0);
  const accuracyDenominator = verifiedCorrect + verifiedIncorrect;
  const verifiedAccuracy = accuracyDenominator ? verifiedCorrect / accuracyDenominator : null;
  const reviewed = Number(metrics?.reviewed || 0);
  const reviewedConfidentMatches = Number(metrics?.reviewed_confident_matches || 0);
  const privacyCleared = Number(metrics?.privacy_cleared || 0);
  const directoryReady = Number(metrics?.directory_ready || 0);

  return {
    batch,
    metrics: {
      total: Number(metrics?.total || 0),
      reviewed,
      reviewedConfidentMatches,
      verifiedCorrect,
      verifiedIncorrect,
      verifiedAccuracy,
      privacyCleared,
      directoryReady,
      researching: Number(metrics?.researching || 0),
      excludedSensitive: Number(metrics?.excluded_sensitive || 0),
      scaleGate: {
        minimumReviewed: 20,
        minimumConfidentMatches: 5,
        minimumAccuracy: 0.9,
        requiredPrivacyClearances: 20,
        requiredDirectoryReady: 20,
        ready: reviewed >= 20 && reviewedConfidentMatches >= 5
          && verifiedAccuracy !== null && verifiedAccuracy >= 0.9
          && privacyCleared >= 20 && directoryReady >= 20,
      },
    },
    candidates: candidatesResult.results.map((row) => ({
      id: row.id,
      sourceRecordId: row.source_record_id,
      sourceRow: parseObject(row.source_row_json),
      proposedChanges: parseObject(row.proposed_changes_json),
      matchState: row.match_state,
      matchScore: row.match_score,
      matchExplanation: row.match_explanation,
      matchedStagingRecordId: row.matched_staging_record_id,
      matchedStaging: parseObject(row.matched_staging_json),
      matchedShelterId: row.matched_shelter_id,
      matchedShelterName: row.matched_shelter_name,
      privacyFlags: parseList(row.privacy_flags_json),
      reviewState: row.review_state,
      reviewOutcome: row.review_outcome,
      reviewerNotes: row.reviewer_notes,
      privacyCleared: row.privacy_cleared === 1,
      verification: parseObject(row.verification_json),
      verificationChecks: parseObject(row.verification_checks_json),
      verificationState: row.verification_state,
      directoryReady: row.directory_ready === 1,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      citation: {
        publisher: row.citation_publisher,
        title: row.citation_title,
        url: row.citation_url,
        licence: row.citation_licence,
        licenceUrl: row.citation_licence_url,
        retrievedAt: row.citation_retrieved_at,
        sourceVersion: row.citation_source_version,
        fieldsSupported: parseList(row.citation_fields_supported_json),
      },
      verificationCitation: row.verification_citation_url ? {
        publisher: row.verification_citation_publisher,
        title: row.verification_citation_title,
        url: row.verification_citation_url,
        retrievedAt: row.verification_citation_retrieved_at,
        fieldsSupported: parseList(row.verification_citation_fields_supported_json),
      } : null,
    })),
  };
}

export async function reviewResearchCandidate(input: {
  id: string;
  outcome: string;
  notes: string;
  privacyCleared: boolean;
  actorEmail: string;
}) {
  await ensureTorontoResearchPilot();
  const allowed = ["match_correct", "match_incorrect", "needs_research", "not_a_current_service"];
  if (!allowed.includes(input.outcome)) throw new Error("Choose a valid review outcome.");
  if (!input.notes.trim()) throw new Error("Add a short reviewer note before saving.");
  const result = await env.DB.prepare(`
    UPDATE research_candidates
    SET review_state = 'reviewed', review_outcome = ?, reviewer_notes = ?,
      privacy_cleared = ?, reviewed_by = ?, reviewed_at = ?
    WHERE id = ? AND batch_id = ? AND review_state != 'excluded_sensitive'
  `).bind(
    input.outcome,
    input.notes.trim().slice(0, 1200),
    input.privacyCleared ? 1 : 0,
    input.actorEmail,
    Date.now(),
    input.id,
    TORONTO_BATCH_ID,
  ).run();
  if (!result.meta.changes) throw new Error("Research candidate not found.");
}

const verificationFields = [
  "verifiedAddress", "verifiedCity", "verifiedPostalCode",
  "phone", "phoneDisplay", "website", "hours", "intake",
  "officialSourceUrl", "officialSourceTitle", "officialSourcePublisher",
] as const;
const verificationCheckFields = [
  "officialSourceConfirmed", "addressConfirmed", "phoneConfirmed", "hoursConfirmed",
  "intakeConfirmed", "scopeConfirmed", "duplicateChecked",
] as const;

function officialSourceUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Add a valid official source URL.");
  }
  if (url.protocol !== "https:") throw new Error("Official sources must use HTTPS.");
  const blocked = [
    "google.", "bing.", "facebook.", "instagram.", "linkedin.", "youtube.",
    "wikipedia.", "211ontario.ca", "streetvoices.ca",
  ];
  if (blocked.some((domain) => url.hostname.toLowerCase().includes(domain))) {
    throw new Error("Use the shelter operator or government source, not a search, social, or directory page.");
  }
  return url.toString();
}

export async function saveResearchVerification(input: {
  id: string;
  verification: Record<string, unknown>;
  checks: Record<string, unknown>;
  notes: string;
  actorEmail: string;
}) {
  await ensureTorontoResearchPilot();
  const candidate = await env.DB.prepare(`
    SELECT * FROM research_candidates WHERE id = ? AND batch_id = ?
  `).bind(input.id, TORONTO_BATCH_ID).first<Row>();
  if (!candidate || candidate.review_state === "excluded_sensitive") {
    throw new Error("This candidate is excluded by the sensitive-shelter policy.");
  }

  const verification = Object.fromEntries(verificationFields.map((field) => [
    field,
    stringValue(input.verification[field]).trim().slice(0, field === "intake" ? 800 : 500),
  ]));
  const checks = Object.fromEntries(verificationCheckFields.map((field) => [
    field,
    input.checks[field] === true,
  ])) as Record<(typeof verificationCheckFields)[number], boolean>;

  if (verification.officialSourceUrl) {
    verification.officialSourceUrl = officialSourceUrl(verification.officialSourceUrl);
  }
  const allChecksComplete = verificationCheckFields.every((field) => checks[field]);
  const requiredFieldsComplete = Boolean(
    verification.verifiedAddress && verification.verifiedCity && verification.verifiedPostalCode
    && verification.phone && verification.website && verification.hours && verification.intake
    && verification.officialSourceUrl && verification.officialSourceTitle && verification.officialSourcePublisher,
  );
  const reviewComplete = candidate.review_state === "reviewed"
    && ["match_correct", "match_incorrect"].includes(stringValue(candidate.review_outcome));
  const directoryReady = allChecksComplete && requiredFieldsComplete && reviewComplete;

  if (allChecksComplete || directoryReady) {
    if (!/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(verification.verifiedPostalCode)) {
      throw new Error("Add a valid Canadian postal code for the verified public address.");
    }
    assertShelterInScope({
      ...parseObject(candidate.proposed_changes_json),
      ...verification,
      address: verification.verifiedAddress,
      city: verification.verifiedCity,
      postalCode: verification.verifiedPostalCode.toUpperCase(),
      scopeConfirmed: checks.scopeConfirmed,
    }, { requireConfirmation: true });
  }
  if (directoryReady && !input.notes.trim()) {
    throw new Error("Add verification notes before marking a candidate directory-ready.");
  }

  await env.DB.batch([
    env.DB.prepare(`
      UPDATE research_candidates
      SET verification_json = ?, verification_checks_json = ?,
        verification_state = ?, directory_ready = ?, reviewer_notes = ?,
        reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND batch_id = ? AND review_state != 'excluded_sensitive'
    `).bind(
      JSON.stringify(verification),
      JSON.stringify(checks),
      directoryReady ? "verified" : "researching",
      directoryReady ? 1 : 0,
      input.notes.trim().slice(0, 1200),
      input.actorEmail,
      Date.now(),
      input.id,
      TORONTO_BATCH_ID,
    ),
    env.DB.prepare(`
      INSERT INTO research_candidate_citations (
        id, candidate_id, publisher, title, url, licence, licence_url,
        retrieved_at, source_version, fields_supported_json
      ) VALUES (?, ?, ?, ?, ?, 'Public website facts – verification use only', ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        publisher = excluded.publisher, title = excluded.title, url = excluded.url,
        licence_url = excluded.licence_url, retrieved_at = excluded.retrieved_at,
        source_version = excluded.source_version, fields_supported_json = excluded.fields_supported_json
    `).bind(
      `verification_${input.id}`,
      input.id,
      verification.officialSourcePublisher || "Official source pending",
      verification.officialSourceTitle || "Official source pending",
      verification.officialSourceUrl || TORONTO_DATASET_URL,
      verification.officialSourceUrl || TORONTO_DATASET_URL,
      Date.now(),
      new Date().toISOString().slice(0, 10),
      JSON.stringify(verificationFields.filter((field) =>
        !field.startsWith("officialSource") && Boolean(verification[field]),
      )),
    ),
  ]);
}
