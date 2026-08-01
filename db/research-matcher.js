export const MATCHER_VERSION = "phase5c.2-v4";

const stopWords = /\b(the|of|canada|toronto|shelter|hostel|program|centre|center)\b/g;

export const normalizeResearchName = (value = "") => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(stopWords, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const tokens = (value) => new Set(normalizeResearchName(value).split(/\s+/).filter(Boolean));

export const researchNameSimilarity = (left = "", right = "") => {
  const normalizedLeft = normalizeResearchName(left);
  const normalizedRight = normalizeResearchName(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  const intersection = [...leftTokens].filter((item) => rightTokens.has(item)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
};

const placeKey = (value = "") => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const samePlace = (left, right) => Boolean(placeKey(left) && placeKey(left) === placeKey(right));
const postalKey = (value = "") => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
const addressKey = (value = "") => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\bstreet\b/g, "st")
  .replace(/\bavenue\b/g, "ave")
  .replace(/\bboulevard\b/g, "blvd")
  .replace(/\broad\b/g, "rd")
  .replace(/\bcourt\b/g, "ct")
  .replace(/\bplace\b/g, "pl")
  .replace(/[^a-z0-9]+/g, "")
  .trim();
const streetNumber = (value = "") => value.trim().match(/^\d+[a-z]?/i)?.[0]?.toLowerCase() ?? "";

function addressEvidence(source, candidate) {
  const sourceAddress = addressKey(source.address);
  const candidateAddress = addressKey(candidate.address);
  const sourcePostal = postalKey(source.postalCode);
  const candidatePostal = postalKey(candidate.postalCode);
  const comparableAddress = Boolean(sourceAddress && candidateAddress);
  const comparablePostal = Boolean(sourcePostal && candidatePostal);
  const confirmed = (comparableAddress && sourceAddress === candidateAddress)
    || (comparablePostal && sourcePostal === candidatePostal);
  const differentStreetNumber = comparableAddress
    && streetNumber(source.address) && streetNumber(candidate.address)
    && streetNumber(source.address) !== streetNumber(candidate.address);
  const conflict = !confirmed && (
    (comparablePostal && sourcePostal !== candidatePostal)
    || differentStreetNumber
  );
  return { confirmed, conflict, known: comparableAddress || comparablePostal };
}

function modelKeys(values) {
  const joined = values.filter(Boolean).join(" ").toLowerCase();
  const keys = new Set();
  if (/\bemergency\b/.test(joined)) keys.add("emergency");
  if (/\btransitional\b/.test(joined)) keys.add("transitional");
  if (/\brespite\b/.test(joined)) keys.add("respite");
  if (/\bsupportive\b/.test(joined)) keys.add("supportive");
  return keys;
}

function serviceModelEvidence(source, candidate) {
  const sourceModels = modelKeys(Array.isArray(source.models) ? source.models : []);
  const candidateModels = modelKeys([candidate.shelterType ?? ""]);
  if (!sourceModels.size || !candidateModels.size) return { compatible: false, conflict: false, known: false };
  const compatible = [...sourceModels].some((model) => candidateModels.has(model));
  return { compatible, conflict: !compatible, known: true };
}

function scoreCandidate(source, candidate) {
  const candidateName = candidate.name ?? "";
  const facilityScore = Math.max(
    researchNameSimilarity(source.name, candidateName),
    researchNameSimilarity(source.group, candidateName),
  );
  const sourcePrograms = Array.isArray(source.programs) ? source.programs.filter(Boolean) : [];
  const programScore = Math.max(
    ...sourcePrograms.map((program) => researchNameSimilarity(program, candidateName)),
    0,
  );
  const exactFacility = [source.name, source.group]
    .some((value) => normalizeResearchName(value) === normalizeResearchName(candidateName));
  const exactProgram = sourcePrograms
    .some((program) => normalizeResearchName(program) === normalizeResearchName(candidateName));
  const organizationScore = researchNameSimilarity(source.org, candidate.organization ?? "");
  const cityScore = samePlace(source.city, candidate.city) ? 1 : 0;
  const provinceScore = String(source.province ?? "").toUpperCase()
    === String(candidate.province ?? "").toUpperCase() ? 1 : 0;
  const address = addressEvidence(source, candidate);
  const model = serviceModelEvidence(source, candidate);

  let score = facilityScore * 0.52 + programScore * 0.2 + organizationScore * 0.1
    + cityScore * 0.06 + provinceScore * 0.04 + (model.compatible ? 0.08 : 0)
    + (address.confirmed ? 0.15 : 0);

  if (exactFacility && !sourcePrograms.length) score = Math.max(score, 0.96);
  if (exactProgram) score = Math.max(score, 0.96);

  // A named source program must not silently collapse into a generic facility.
  if (sourcePrograms.length && !exactProgram && programScore < 0.82) score = Math.min(score, 0.69);
  // Known address or service-model conflicts veto an otherwise attractive name match.
  if (address.conflict || model.conflict) score = Math.min(score, 0.49);

  const evidence = [
    `facility ${Math.round(facilityScore * 100)}%`,
    sourcePrograms.length ? `program ${Math.round(programScore * 100)}%` : "program not supplied",
    `organization ${Math.round(organizationScore * 100)}%`,
    address.confirmed ? "address confirmed" : address.conflict ? "address conflict" : "address unavailable",
    model.compatible ? "service model confirmed" : model.conflict ? "service model conflict" : "service model unavailable",
  ];

  return { ...candidate, score: Math.min(1, score), explanation: evidence.join(" · ") };
}

export function bestResearchMatch(source, candidates) {
  const ranked = candidates
    .filter((candidate) => candidate?.id && candidate?.name)
    .map((candidate) => scoreCandidate(source, candidate))
    .sort((left, right) => right.score - left.score);
  const first = ranked[0];
  const second = ranked[1];

  if (!first || first.score < 0.7) {
    return {
      state: "unmatched",
      score: first?.score ?? 0,
      explanation: `${MATCHER_VERSION} · ${first
        ? `No reliable facility match. Closest: ${first.name} (${Math.round(first.score * 100)}%). ${first.explanation}.`
        : "No eligible Ontario directory candidate found."}`,
    };
  }
  if (second && second.score >= 0.7 && first.score - second.score < 0.08) {
    return {
      state: "ambiguous",
      score: first.score,
      match: first,
      explanation: `${MATCHER_VERSION} · Two close facility possibilities: ${first.name} and ${second.name}. Human choice required.`,
    };
  }
  return {
    state: first.score >= 0.96 ? "exact" : "probable",
    score: first.score,
    match: first,
    explanation: `${MATCHER_VERSION} · ${first.name}: ${first.explanation}.`,
  };
}
