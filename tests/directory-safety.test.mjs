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
