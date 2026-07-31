import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public search reads published records from the shelter API", async () => {
  const [page, api] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/shelters/route.ts"),
  ]);

  assert.match(page, /fetch\("\/api\/shelters\?limit=200"/);
  assert.doesNotMatch(page, /seed-shelters|shelter-data/);
  assert.match(api, /listPublishedShelters/);
  assert.match(api, /Seeker coordinates are intentionally not accepted/);
});

test("public serialization protects confidential locations and stale capacity", async () => {
  const directory = await read("db/directory.ts");

  assert.match(directory, /confidential \? "Confidential location — call for directions"/);
  assert.match(directory, /confidential \? \{\} : \{/);
  assert.match(directory, /expiresAt > Date\.now\(\)/);
  assert.match(directory, /: "call"/);
  assert.match(directory, /s\.publication_state = 'published'/);
});

test("directory review requires an authenticated authorized operator", async () => {
  const [page, api] = await Promise.all([
    read("app/admin/directory/page.tsx"),
    read("app/api/admin/directory/route.ts"),
  ]);

  assert.match(page, /requireOperatorPage\("\/admin\/directory"\)/);
  assert.match(api, /requireOperatorApi/);
  assert.match(api, /Authentication required/);
});

test("imports are staged and publication is a separate audited action", async () => {
  const directory = await read("db/directory.ts");

  assert.match(directory, /review_state.*'pending'/s);
  assert.match(directory, /publication_state = 'published'/);
  assert.match(directory, /approved_for_publication/);
  assert.match(directory, /action.*actor_email.*changed_fields_json.*reason/s);
});

test("operator authorization protects curation and participation review", async () => {
  const [operatorAuth, directoryApi, participantsApi] = await Promise.all([
    read("app/operator-auth.ts"),
    read("app/api/admin/directory/route.ts"),
    read("app/api/admin/participants/route.ts"),
  ]);

  assert.match(operatorAuth, /isPlatformOperator/);
  assert.match(directoryApi, /requireOperatorApi/);
  assert.match(participantsApi, /requireOperatorApi/);
  assert.match(participantsApi, /Operator access required/);
});

test("shelter staff can update only their assigned shelter", async () => {
  const [api, participation] = await Promise.all([
    read("app/api/admin/shelter/route.ts"),
    read("db/participation.ts"),
  ]);

  assert.match(api, /shelterId !== workspace\.shelter\.id/);
  assert.match(api, /You can update only your assigned shelter/);
  assert.match(participation, /WHERE shelter_id = \? AND LOWER\(email\) = \? AND status = 'active'/);
  assert.match(participation, /availability_expires_at = \?/);
  assert.match(participation, /participation_state = 'participating'/);
});

test("public API has no staff, enrolment, operator, or audit joins", async () => {
  const api = await read("app/api/shelters/route.ts");
  const directory = await read("db/directory.ts");
  const publicQuery = directory.slice(
    directory.indexOf("export async function listPublishedShelters"),
    directory.indexOf("function parseCsv"),
  );

  assert.doesNotMatch(api, /staff|enrollment|operator|actor_email/i);
  assert.doesNotMatch(publicQuery, /shelter_staff_access|shelter_enrollment_requests|platform_operators|directory_review_activity/);
});

test("Phase 2 schema stores shelter operations, not guest records", async () => {
  const participation = await read("db/participation.ts");

  assert.match(participation, /shelter_availability_updates/);
  assert.match(participation, /shelter_staff_access/);
  assert.doesNotMatch(participation, /guest_name|date_of_birth|health_details|case_notes/);
});

test("NSPL 2024 migration stages all 1,114 federal records privately", async () => {
  const migration = await read("drizzle/0003_nspl_2024_candidates.sql");
  const stagedIds = migration.match(/stage_nspl_2024_\d+/g) || [];

  assert.equal(new Set(stagedIds).size, 1114);
  assert.match(migration, /'batch_nspl_2024'/);
  assert.match(migration, /'Open Government Licence – Canada 2\.0'/);
  assert.match(migration, /'6f73b3febcb04ddeb91a9a7368f12d826058b8c4aa0e68ee102aade2f0e190f3'/);
  assert.match(migration, /'pending'/);
  assert.doesNotMatch(migration, /INSERT.+INTO shelters/is);
});

test("federal candidates retain identifiers and permanent capacity without claiming live space", async () => {
  const [directory, migration] = await Promise.all([
    read("db/directory.ts"),
    read("drizzle/0003_nspl_2024_candidates.sql"),
  ]);

  assert.match(directory, /shelter_external_identifiers/);
  assert.match(directory, /federalServiceProviderId/);
  assert.match(directory, /total_beds/);
  assert.match(migration, /Federal bed count is permanent capacity, not live availability/);
});

test("national review supports scoped search and pagination", async () => {
  const [directory, client] = await Promise.all([
    read("db/directory.ts"),
    read("app/admin/directory/DirectoryReviewClient.tsx"),
  ]);

  assert.match(directory, /json_extract\(parsed_json, '\$\.federalServiceProviderId'\)/);
  assert.match(directory, /json_extract\(parsed_json, '\$\.provinceCode'\)/);
  assert.match(directory, /LIMIT \? OFFSET \?/);
  assert.match(client, /Search federal ID, shelter, organization, or city/);
  assert.match(client, /Permanent beds are not current availability/);
});

test("Phase 4A workbench scopes one editor and supports enrichment filters", async () => {
  const [directory, client, api] = await Promise.all([
    read("db/directory.ts"),
    read("app/admin/directory/DirectoryReviewClient.tsx"),
    read("app/api/admin/directory/route.ts"),
  ]);

  assert.match(client, /candidate-queue/);
  assert.match(client, /candidate-editor/);
  assert.match(client, /Public readiness/);
  assert.match(client, /Official-source search/);
  assert.match(api, /shelterType/);
  assert.match(api, /focus/);
  assert.match(directory, /focus === "missing_phone"/);
  assert.match(directory, /focus === "core_complete"/);
  assert.match(directory, /shelterType === "transitional"/);
});

test("public coverage reports the federal foundation but public results stay published-only", async () => {
  const [page, directory] = await Promise.all([
    read("app/page.tsx"),
    read("db/directory.ts"),
  ]);

  assert.match(page, /federal shelter records under verification/);
  assert.match(page, /Open Government Licence/);
  assert.match(directory, /federalCandidates/);
  assert.match(directory, /s\.publication_state = 'published'/);
});

test("Phase 4B public results prioritize urgent actions and preserve device-only location", async () => {
  const page = await read("app/page.tsx");

  assert.match(page, /resultsRef/);
  assert.match(page, /Who this shelter serves/);
  assert.match(page, /How to get in/);
  assert.match(page, /Availability updated/);
  assert.match(page, /directory-explanation/);
  assert.match(page, /href="tel:211"/);
  assert.match(page, /fetch\("\/api\/shelters\?limit=200", \{ signal/);
  assert.match(page, /Distance is calculated on this device/);
});

test("Phase 4C community corrections stay private and human-reviewed", async () => {
  const [page, publicApi, adminApi, corrections, migration] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/corrections/route.ts"),
    read("app/api/admin/corrections/route.ts"),
    read("db/corrections.ts"),
    read("drizzle/0004_community_corrections.sql"),
  ]);

  assert.match(page, /\/correct\?shelterId=/);
  assert.match(publicApi, /privacyAccepted/);
  assert.doesNotMatch(publicApi, /contactName|officialEmail|guest_name|date_of_birth/i);
  assert.match(adminApi, /requireOperatorApi/);
  assert.match(corrections, /INSERT INTO shelter_correction_requests/);
  assert.match(corrections, /UPDATE shelter_correction_requests/);
  assert.doesNotMatch(corrections, /UPDATE shelters/);
  assert.match(migration, /shelter_correction_requests/);
});

test("Phase 4C shelter claims preselect and prefill the published listing", async () => {
  const [page, join] = await Promise.all([
    read("app/page.tsx"),
    read("app/join/page.tsx"),
  ]);

  assert.match(page, /\/join\?shelterId=/);
  assert.match(join, /requestedId/);
  assert.match(join, /setSelectedShelterId/);
  assert.match(join, /setOrganizationName/);
  assert.match(join, /claim-selection/);
});

test("Phase 5A research candidates are private, operator-only, and never auto-published", async () => {
  const [page, api, research] = await Promise.all([
    read("app/admin/research/page.tsx"),
    read("app/api/admin/research/route.ts"),
    read("db/research.ts"),
  ]);

  assert.match(page, /requireOperatorPage\("\/admin\/research"\)/);
  assert.match(api, /requireOperatorApi/);
  assert.match(research, /publication_guard.*private_review_only/s);
  assert.match(research, /review_state = 'reviewed'/);
  assert.doesNotMatch(research, /UPDATE shelters SET|INSERT INTO shelters/);
});

test("Phase 5A Toronto pilot contains exactly 25 dated structured records without live capacity", async () => {
  const seed = await read("db/toronto-research-seed.ts");
  const records = seed.match(/\{ id: "\d+"/g) || [];

  assert.equal(records.length, 25);
  assert.match(seed, /official City of Toronto feed/);
  assert.doesNotMatch(seed, /spacesAvailable|occupiedBeds|capacityActual|availabilityStatus/);
});

test("Phase 5A attaches provenance to every proposal and measures verified accuracy before scaling", async () => {
  const [research, client, migration] = await Promise.all([
    read("db/research.ts"),
    read("app/admin/research/ResearchCandidatesClient.tsx"),
    read("drizzle/0005_useful_bruce_banner.sql"),
  ]);

  assert.match(research, /research_candidate_citations/);
  assert.match(research, /Open Government Licence – Toronto/);
  assert.match(research, /verifiedAccuracy/);
  assert.match(research, /minimumReviewed: 20/);
  assert.match(research, /minimumAccuracy: 0\.9/);
  assert.match(client, /100-record daily run remains locked/);
  assert.match(client, /Publication lock is on/);
  assert.match(migration, /research_candidates/);
  assert.doesNotMatch(migration, /INSERT.+INTO shelters/is);
});

test("sensitive-shelter policy is a hard guard from import through publication", async () => {
  const [policy, directory, client] = await Promise.all([
    read("db/shelter-scope-policy.ts"),
    read("db/directory.ts"),
    read("app/admin/directory/DirectoryReviewClient.tsx"),
  ]);

  assert.match(policy, /Confidential or protected location/);
  assert.match(policy, /Women-only service/);
  assert.match(policy, /violence against women/);
  assert.match(policy, /refugee/);
  assert.match(policy, /motel\\\/hotel shelter/);
  assert.match(directory, /reviewState = scope\.eligible \? "pending" : "excluded_sensitive"/);
  assert.match(directory, /assertShelterInScope\(stage\.parsed, \{ requireConfirmation: true \}\)/);
  assert.match(directory, /scope_state = 'eligible_general'/);
  assert.match(client, /Hard safety boundary/);
  assert.match(client, /General-shelter scope confirmed/);
});

test("public directory requires an eligible general-shelter scope state", async () => {
  const directory = await read("db/directory.ts");
  const publicQuery = directory.slice(
    directory.indexOf("export async function listPublishedShelters"),
    directory.indexOf("function parseCsv"),
  );

  assert.match(publicQuery, /s\.scope_state = 'eligible_general'/);
  assert.match(directory, /AND scope_state = 'eligible_general'/);
});

test("migration archives known sensitive Montreal listings and replaces the unscreened Toronto pilot", async () => {
  const migration = await read("drizzle/0006_unusual_terror.sql");

  for (const id of ["old-brewery-mackenzie", "chez-doris", "dans-la-rue-bunker", "auberge-shalom"]) {
    assert.match(migration, new RegExp(id));
  }
  assert.match(migration, /scope_state` = 'excluded_sensitive'/);
  assert.match(migration, /research_toronto_20260729_pilot25/);
  assert.match(migration, /DELETE FROM `research_candidates`/);
});

test("screened Toronto research seed contains only 25 public established locations", async () => {
  const [seed, research] = await Promise.all([
    read("db/toronto-research-seed.ts"),
    read("db/research.ts"),
  ]);
  const records = seed.match(/\{ id: "\d+"/g) || [];
  const recordsOnly = seed.slice(seed.indexOf("export const torontoResearchPilot"));

  assert.equal(records.length, 25);
  assert.doesNotMatch(recordsOnly, /refugee|women's|women-only|motel\/hotel|hotel program|confidential|violence|victim|survivor/i);
  assert.match(research, /assertShelterInScope/);
  assert.match(research, /general25_v2/);
});

test("Phase 5B seeds official operator and government sources without publishing them", async () => {
  const [seed, research] = await Promise.all([
    read("db/toronto-verification-seed.ts"),
    read("db/research.ts"),
  ]);
  const records = seed.match(/sourceRecordId: "\d+"/g) || [];

  assert.equal(records.length, 22);
  assert.match(seed, /checked on 2026-07-30/);
  assert.match(seed, /City of Toronto|Covenant House Toronto|Dixon Hall/);
  assert.match(research, /verification_\$\{candidateId\}/);
  assert.match(research, /verification_state = 'unstarted'/);
  assert.doesNotMatch(research, /UPDATE shelters SET|INSERT INTO shelters/);
});

test("Phase 5B verification requires official facts and all seven safety checks", async () => {
  const [research, client, api] = await Promise.all([
    read("db/research.ts"),
    read("app/admin/research/ResearchCandidatesClient.tsx"),
    read("app/api/admin/research/route.ts"),
  ]);

  for (const check of [
    "officialSourceConfirmed", "addressConfirmed", "phoneConfirmed",
    "hoursConfirmed", "intakeConfirmed", "scopeConfirmed", "duplicateChecked",
  ]) {
    assert.match(research, new RegExp(check));
    assert.match(client, new RegExp(check));
  }
  assert.match(research, /Official sources must use HTTPS/);
  assert.match(research, /assertShelterInScope/);
  assert.match(research, /requiredDirectoryReady: 20/);
  assert.match(client, /Nothing publishes automatically/);
  assert.match(api, /saveResearchVerification/);
  assert.match(api, /body\.action === "verification"/);
});

test("Phase 5B hard-excludes sensitive or specialized candidates", async () => {
  const [seed, migration, research] = await Promise.all([
    read("db/toronto-verification-seed.ts"),
    read("drizzle/0007_bored_northstar.sql"),
    read("db/research.ts"),
  ]);

  for (const id of ["1053", "1054", "1741", "1001"]) {
    assert.match(migration, new RegExp(`'${id}'`));
  }
  assert.equal((seed.match(/exclusionReason:/g) || []).length, 4);
  assert.match(migration, /excluded_sensitive/);
  assert.match(research, /review_state != 'excluded_sensitive'/);
  assert.match(research, /This candidate is excluded by the sensitive-shelter policy/);
});

test("Phase 5B schema records private verification state and directory readiness", async () => {
  const [schema, migration] = await Promise.all([
    read("db/schema.ts"),
    read("drizzle/0007_bored_northstar.sql"),
  ]);

  assert.match(schema, /verificationJson/);
  assert.match(schema, /verificationChecksJson/);
  assert.match(schema, /verificationState/);
  assert.match(schema, /directoryReady/);
  assert.match(migration, /ADD `verification_json`/);
  assert.match(migration, /ADD `directory_ready`/);
  assert.doesNotMatch(migration, /INSERT.+INTO shelters/is);
});

test("Phase 5B.2 matcher prioritizes facility identity and versions every suggestion", async () => {
  const research = await read("db/research.ts");

  assert.match(research, /MATCHER_VERSION = "phase5b\.2-v2"/);
  assert.match(research, /facilityScore \* 0\.8 \+ organizationScore \* 0\.1/);
  assert.match(research, /exactFacility/);
  assert.match(research, /first\.score < 0\.7/);
  assert.match(research, /first\.score - second\.score < 0\.08/);
  assert.doesNotMatch(
    research,
    /SELECT id, name, city, province_code, umbrella_organization, shelter_type FROM shelters/,
  );
});

test("Phase 5B.2 refresh reopens only changed suggestions without erasing research evidence", async () => {
  const research = await read("db/research.ts");
  const refresh = research.slice(
    research.indexOf("async function refreshPhase5B2Matches"),
    research.indexOf("export async function ensureTorontoResearchPilot"),
  );

  assert.match(refresh, /review_state = 'reviewed' THEN 'pending'/);
  assert.match(refresh, /review_outcome = CASE WHEN \? = 1 THEN NULL/);
  assert.match(refresh, /directory_ready = CASE WHEN \? = 1 THEN 0/);
  assert.doesNotMatch(refresh, /verification_json\s*=/);
  assert.doesNotMatch(refresh, /reviewer_notes\s*=/);
});

test("Phase 5B.2 accuracy gate evaluates confident suggestions only", async () => {
  const [research, client] = await Promise.all([
    read("db/research.ts"),
    read("app/admin/research/ResearchCandidatesClient.tsx"),
  ]);

  assert.match(research, /match_state IN \('exact', 'probable'\).*AS verified_correct/s);
  assert.match(research, /reviewedConfidentMatches >= 5/);
  assert.match(research, /minimumConfidentMatches: 5/);
  assert.match(client, /Confident match accuracy/);
  assert.match(client, /exact or probable suggestions checked/);
});

test("Phase 5B.2 stores verified address corrections privately and preserves the source proposal", async () => {
  const [research, client] = await Promise.all([
    read("db/research.ts"),
    read("app/admin/research/ResearchCandidatesClient.tsx"),
  ]);

  for (const field of ["verifiedAddress", "verifiedCity", "verifiedPostalCode"]) {
    assert.match(research, new RegExp(field));
    assert.match(client, new RegExp(field));
  }
  assert.match(research, /valid Canadian postal code/);
  assert.match(research, /address: verification\.verifiedAddress/);
  assert.match(client, /original source evidence is preserved/i);
  assert.match(client, /Nothing publishes automatically/);
  assert.doesNotMatch(research, /UPDATE shelters SET|INSERT INTO shelters/);
});
