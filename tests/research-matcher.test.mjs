import assert from "node:assert/strict";
import test from "node:test";
import { bestResearchMatch, MATCHER_VERSION } from "../db/research-matcher.js";

const candidate = (id, name, shelterType, extra = {}) => ({
  id,
  name,
  shelterType,
  organization: extra.organization ?? "",
  city: extra.city ?? "Toronto",
  province: extra.province ?? "ON",
  address: extra.address ?? "",
  postalCode: extra.postalCode ?? "",
});

test("Phase 5C.2 sends Covenant House McGill to Rights of Passage", () => {
  const source = {
    name: "Covenant House McGill St",
    group: "Covenant House",
    org: "Covenant House Toronto",
    city: "Toronto",
    province: "ON",
    address: "21 McGill St",
    postalCode: "M5B 1H3",
    models: ["Transitional"],
    programs: ["Covenant House Rights of Passage"],
  };
  const match = bestResearchMatch(source, [
    candidate("rights", "Covenant House Rights of Passage", "Transitional Housing", {
      organization: "Covenant House Toronto",
    }),
    candidate("residence", "Covenant House Residence", "Emergency", {
      organization: "Covenant House Toronto",
    }),
  ]);

  assert.equal(MATCHER_VERSION, "phase5c.2-v4");
  assert.equal(match.match?.id, "rights");
  assert.equal(match.state, "exact");
});

test("Phase 5C.2 separates the two Christie Ossington facilities", () => {
  const shared = {
    group: "Christie Ossington Men's Hostel",
    org: "Christie Ossington Neighbourhood Centre",
    city: "Toronto",
    province: "ON",
    models: ["Emergency"],
  };
  const candidates = [
    candidate("south", "Christie Ossington Men's Hostel South", "Emergency", {
      organization: shared.org,
    }),
    candidate("generic", "Christie Ossington Men's Hostel", "Emergency", {
      organization: shared.org,
    }),
  ];

  const bloor = bestResearchMatch({
    ...shared,
    name: "CONC Men's Shelter Bloor St W",
    address: "850 Bloor St W",
    postalCode: "M6G 1M2",
    programs: ["Christie Ossington Men's Hostel South"],
  }, candidates);
  const lansdowne = bestResearchMatch({
    ...shared,
    name: "CONC Men's Shelter Lansdowne Ave",
    address: "973 Lansdowne Ave",
    postalCode: "M6H 3Z5",
    programs: [],
  }, candidates);

  assert.equal(bloor.match?.id, "south");
  assert.equal(lansdowne.match?.id, "generic");
});

test("Phase 5C.2 vetoes known address and service-model conflicts", () => {
  const source = {
    name: "Example House",
    group: "Example House",
    org: "Example Society",
    city: "Toronto",
    province: "ON",
    address: "10 King St W",
    postalCode: "M5H 1A1",
    models: ["Transitional"],
    programs: [],
  };
  const wrongAddress = bestResearchMatch(source, [
    candidate("wrong-address", "Example House", "Transitional Housing", {
      address: "99 Queen St E",
      postalCode: "M5C 1B5",
    }),
  ]);
  const wrongModel = bestResearchMatch(source, [
    candidate("wrong-model", "Example House", "Emergency", {
      address: "10 King Street West",
      postalCode: "M5H 1A1",
    }),
  ]);

  assert.equal(wrongAddress.state, "unmatched");
  assert.match(wrongAddress.explanation, /address conflict/);
  assert.equal(wrongModel.state, "unmatched");
  assert.match(wrongModel.explanation, /service model conflict/);
});

test("Phase 5C.2 leaves same-address facility programs ambiguous", () => {
  const source = {
    name: "HFS 545 Lake Shore Blvd W Shelter",
    group: "Lake Shore Shelter",
    org: "Homes First Society",
    city: "Toronto",
    province: "ON",
    address: "545 Lake Shore Blvd W",
    postalCode: "M5V 1A3",
    models: ["Emergency"],
    programs: [],
  };
  const match = bestResearchMatch(source, [
    candidate("couples", "545 Lake Shore Blvd W Couples", "Emergency", {
      organization: "Homes First Society",
      address: "545 Lake Shore Boulevard West",
      postalCode: "M5V 1A3",
    }),
    candidate("men", "545 Lake Shore Blvd W Men", "Emergency", {
      organization: "Homes First Society",
      address: "545 Lake Shore Boulevard West",
      postalCode: "M5V 1A3",
    }),
  ]);

  assert.equal(match.state, "ambiguous");
  assert.match(match.explanation, /Human choice required/);
});
