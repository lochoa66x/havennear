import { env } from "cloudflare:workers";
import { ensureDirectorySchema } from "./directory";
import { assertShelterInScope } from "./shelter-scope-policy";
import { torontoResearchPilot, type TorontoResearchSeed } from "./toronto-research-seed";

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
const normalize = (value: string) => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\b(the|of|canada|toronto|shelter|hostel|program|centre|center)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();
const tokens = (value: string) => new Set(normalize(value).split(/\s+/).filter((item) => item.length > 1));
const similarity = (left: string, right: string) => {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  const intersection = [...leftTokens].filter((item) => rightTokens.has(item)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
};

type Match = {
  id: string;
  shelterId?: string;
  score: number;
  explanation: string;
  name: string;
};

function bestMatch(source: TorontoResearchSeed, staging: Row[], shelters: Row[]) {
  const sourceNames = [source.name, source.group, source.org].filter(Boolean);
  const candidates: Match[] = [];

  for (const row of staging) {
    const parsed = parseObject(row.parsed_json);
    const candidateNames = [
      stringValue(parsed.name),
      stringValue(parsed.umbrellaOrganization),
    ].filter(Boolean);
    const nameScore = Math.max(...sourceNames.flatMap((left) => candidateNames.map((right) => similarity(left, right))), 0);
    const sameProvince = stringValue(parsed.provinceCode).toUpperCase() === "ON";
    const cityScore = similarity(source.city, stringValue(parsed.city));
    const score = Math.min(1, nameScore * 0.9 + (sameProvince ? 0.04 : 0) + cityScore * 0.06);
    candidates.push({
      id: stringValue(row.id),
      score,
      name: stringValue(parsed.name),
      explanation: `Name ${Math.round(nameScore * 100)}% · city ${Math.round(cityScore * 100)}% · Ontario ${sameProvince ? "yes" : "no"}`,
    });
  }

  for (const row of shelters) {
    const nameScore = Math.max(...sourceNames.map((left) => similarity(left, stringValue(row.name))), 0);
    const sameProvince = stringValue(row.province_code).toUpperCase() === "ON";
    const cityScore = similarity(source.city, stringValue(row.city));
    const score = Math.min(1, nameScore * 0.9 + (sameProvince ? 0.04 : 0) + cityScore * 0.06);
    candidates.push({
      id: stringValue(row.id),
      shelterId: stringValue(row.id),
      score,
      name: stringValue(row.name),
      explanation: `Existing shelter · name ${Math.round(nameScore * 100)}% · city ${Math.round(cityScore * 100)}%`,
    });
  }

  candidates.sort((left, right) => right.score - left.score);
  const first = candidates[0];
  const second = candidates[1];
  if (!first || first.score < 0.62) {
    return { state: "unmatched", score: first?.score ?? 0, explanation: first ? `No strong match. Closest: ${first.name} (${Math.round(first.score * 100)}%).` : "No Ontario directory candidate found." };
  }
  if (second && second.score >= 0.62 && first.score - second.score < 0.04) {
    return { state: "ambiguous", score: first.score, match: first, explanation: `Two close possibilities: ${first.name} and ${second.name}. Human choice required.` };
  }
  return {
    state: first.score >= 0.94 ? "exact" : "probable",
    score: first.score,
    match: first,
    explanation: `${first.name}: ${first.explanation}.`,
  };
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

export async function ensureTorontoResearchPilot() {
  await ensureDirectorySchema();
  await ensureResearchSchema();
  const existing = await env.DB.prepare(`SELECT id FROM research_batches WHERE id = ?`)
    .bind(TORONTO_BATCH_ID)
    .first<{ id: string }>();
  if (existing) return;
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
      SELECT id, name, city, province_code FROM shelters
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
}

export async function getResearchDashboard(options: { search?: string; matchState?: string } = {}) {
  await ensureTorontoResearchPilot();
  const search = (options.search || "").trim().toLowerCase().slice(0, 120);
  const matchState = (options.matchState || "").trim().toLowerCase();
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

  const [batch, candidatesResult, metrics] = await Promise.all([
    env.DB.prepare(`SELECT * FROM research_batches WHERE id = ?`).bind(TORONTO_BATCH_ID).first<Row>(),
    env.DB.prepare(`
      SELECT c.*, citation.publisher AS citation_publisher, citation.title AS citation_title,
        citation.url AS citation_url, citation.licence AS citation_licence,
        citation.licence_url AS citation_licence_url, citation.retrieved_at AS citation_retrieved_at,
        citation.source_version AS citation_source_version,
        citation.fields_supported_json AS citation_fields_supported_json,
        stage.parsed_json AS matched_staging_json,
        shelter.name AS matched_shelter_name
      FROM research_candidates c
      LEFT JOIN research_candidate_citations citation ON citation.candidate_id = c.id
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
        SUM(CASE WHEN review_outcome = 'match_correct' THEN 1 ELSE 0 END) AS verified_correct,
        SUM(CASE WHEN review_outcome = 'match_incorrect' THEN 1 ELSE 0 END) AS verified_incorrect,
        SUM(CASE WHEN privacy_cleared = 1 THEN 1 ELSE 0 END) AS privacy_cleared
      FROM research_candidates WHERE batch_id = ?
    `).bind(TORONTO_BATCH_ID).first<Row>(),
  ]);

  const verifiedCorrect = Number(metrics?.verified_correct || 0);
  const verifiedIncorrect = Number(metrics?.verified_incorrect || 0);
  const accuracyDenominator = verifiedCorrect + verifiedIncorrect;
  const verifiedAccuracy = accuracyDenominator ? verifiedCorrect / accuracyDenominator : null;
  const reviewed = Number(metrics?.reviewed || 0);
  const privacyCleared = Number(metrics?.privacy_cleared || 0);

  return {
    batch,
    metrics: {
      total: Number(metrics?.total || 0),
      reviewed,
      verifiedCorrect,
      verifiedIncorrect,
      verifiedAccuracy,
      privacyCleared,
      scaleGate: {
        minimumReviewed: 20,
        minimumAccuracy: 0.9,
        requiredPrivacyClearances: 20,
        ready: reviewed >= 20 && verifiedAccuracy !== null && verifiedAccuracy >= 0.9 && privacyCleared >= 20,
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
    WHERE id = ? AND batch_id = ?
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
