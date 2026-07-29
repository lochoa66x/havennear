import { env } from "cloudflare:workers";

type Row = Record<string, unknown>;

const schema = [
  `CREATE TABLE IF NOT EXISTS shelter_correction_requests (
    id TEXT PRIMARY KEY NOT NULL,
    shelter_id TEXT NOT NULL,
    correction_type TEXT NOT NULL,
    details TEXT NOT NULL,
    source_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_review',
    reviewer_note TEXT NOT NULL DEFAULT '',
    reviewed_by TEXT,
    created_at INTEGER NOT NULL,
    reviewed_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS shelter_corrections_status_created_idx
    ON shelter_correction_requests(status, created_at)`,
];

export async function ensureCorrectionSchema() {
  await env.DB.batch(schema.map((statement) => env.DB.prepare(statement)));
}

export async function createCorrectionRequest(input: {
  id: string;
  shelterId: string;
  correctionType: string;
  details: string;
  sourceUrl?: string;
}) {
  await ensureCorrectionSchema();
  const shelter = await env.DB.prepare(`
    SELECT id FROM shelters WHERE id = ? AND publication_state = 'published'
  `).bind(input.shelterId).first<{ id: string }>();
  if (!shelter) throw new Error("Choose a published shelter listing.");

  await env.DB.prepare(`
    INSERT INTO shelter_correction_requests (
      id, shelter_id, correction_type, details, source_url, status,
      reviewer_note, created_at
    ) VALUES (?, ?, ?, ?, ?, 'pending_review', '', ?)
  `).bind(
    input.id,
    input.shelterId,
    input.correctionType,
    input.details,
    input.sourceUrl || null,
    Date.now(),
  ).run();
}

export async function getCorrectionReviewDashboard() {
  await ensureCorrectionSchema();
  const [requests, counts] = await Promise.all([
    env.DB.prepare(`
      SELECT
        request.*,
        shelter.name AS shelter_name,
        shelter.city AS shelter_city,
        shelter.province_code AS shelter_province_code,
        shelter.phone_display AS current_phone,
        shelter.hours AS current_hours,
        shelter.intake AS current_intake,
        shelter.confidential_address,
        source.url AS current_source_url
      FROM shelter_correction_requests request
      JOIN shelters shelter ON shelter.id = request.shelter_id
      LEFT JOIN shelter_sources source ON source.id = (
        SELECT id FROM shelter_sources
        WHERE shelter_id = shelter.id AND status = 'active'
        ORDER BY COALESCE(verified_at, retrieved_at) DESC LIMIT 1
      )
      ORDER BY
        CASE request.status WHEN 'pending_review' THEN 0 ELSE 1 END,
        request.created_at DESC
      LIMIT 200
    `).all<Row>(),
    env.DB.prepare(`
      SELECT
        SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) AS dismissed
      FROM shelter_correction_requests
    `).first<Row>(),
  ]);
  return {
    requests: requests.results,
    counts: counts ?? { pending: 0, resolved: 0, dismissed: 0 },
  };
}

export async function reviewCorrection(input: {
  id: string;
  status: "resolved" | "dismissed";
  reviewerNote: string;
  actorEmail: string;
}) {
  await ensureCorrectionSchema();
  if (!input.reviewerNote.trim()) throw new Error("A private review note is required.");
  const result = await env.DB.prepare(`
    UPDATE shelter_correction_requests
    SET status = ?, reviewer_note = ?, reviewed_by = ?, reviewed_at = ?
    WHERE id = ? AND status = 'pending_review'
  `).bind(
    input.status,
    input.reviewerNote.trim().slice(0, 1200),
    input.actorEmail,
    Date.now(),
    input.id,
  ).run();
  if (!result.meta.changes) throw new Error("This correction is no longer pending.");
}
