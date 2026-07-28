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

test("directory review requires an authenticated ChatGPT user", async () => {
  const [page, api] = await Promise.all([
    read("app/admin/directory/page.tsx"),
    read("app/api/admin/directory/route.ts"),
  ]);

  assert.match(page, /requireChatGPTUser\("\/admin\/directory"\)/);
  assert.match(api, /getChatGPTUser/);
  assert.match(api, /Authentication required/);
});

test("imports are staged and publication is a separate audited action", async () => {
  const directory = await read("db/directory.ts");

  assert.match(directory, /review_state.*'pending'/s);
  assert.match(directory, /publication_state = 'published'/);
  assert.match(directory, /approved_for_publication/);
  assert.match(directory, /action.*actor_email.*changed_fields_json.*reason/s);
});
