type ShelterScopeInput = {
  name?: unknown;
  shelterType?: unknown;
  address?: unknown;
  phone?: unknown;
  website?: unknown;
  intake?: unknown;
  groups?: unknown;
  services?: unknown;
  confidentialAddress?: unknown;
  genderServed?: unknown;
  targetClientele?: unknown;
  umbrellaOrganization?: unknown;
  sourceText?: unknown;
  programs?: unknown;
  scopeConfirmed?: unknown;
};

export type ShelterScopeAssessment = {
  eligible: boolean;
  reasons: string[];
};

const value = (input: unknown) => typeof input === "string" ? input : "";
const list = (input: unknown) => Array.isArray(input)
  ? input.filter((item): item is string => typeof item === "string")
  : [];
const normalized = (input: ShelterScopeInput) => [
  value(input.name),
  value(input.shelterType),
  value(input.address),
  value(input.intake),
  value(input.genderServed),
  value(input.targetClientele),
  value(input.umbrellaOrganization),
  value(input.sourceText),
  ...list(input.groups),
  ...list(input.services),
  ...list(input.programs),
].join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const sensitivePatterns = [
  /\bviolence against women\b/,
  /\bviolence faite aux femmes\b/,
  /\bdomestic violence\b/,
  /\bfamily violence\b/,
  /\bintimate partner violence\b/,
  /\bvictim(?:s)?\b/,
  /\bsurvivor(?:s)?\b/,
  /\babuse\b/,
  /\btrafficking\b/,
  /\brefugee(?:s)?\b/,
  /\basylum\b/,
  /\bprotected person(?:s)?\b/,
  /\bsafe house\b/,
  /\bsecure location\b/,
  /\bconfidential location\b/,
  /\bwomen in vulnerable situations\b/,
  /\bwomen and children affected\b/,
];

const temporaryPatterns = [
  /\bmotel\/hotel shelter\b/,
  /\bhotel\/motel shelter\b/,
  /\bhotel program\b/,
  /\btemporary (?:shelter|site|location)\b/,
  /\bisolation (?:site|centre|center)\b/,
  /\brecovery site\b/,
  /\b24-hour respite site\b/,
];

function isWomenOnly(input: ShelterScopeInput) {
  const gender = value(input.genderServed).trim().toLowerCase();
  const groups = list(input.groups).map((item) => item.trim().toLowerCase());
  const explicitlyWomen = ["women", "woman", "female", "femmes", "femme"].includes(gender)
    || groups.some((item) => ["women", "woman", "female", "femmes", "femme"].includes(item));
  const explicitlyMixed = ["mixed", "mixed adult", "all genders", "everyone", "families", "men and women"]
    .some((item) => gender.includes(item) || groups.some((group) => group.includes(item)))
    || groups.some((item) => ["men", "male", "hommes", "families"].includes(item));
  return explicitlyWomen && !explicitlyMixed;
}

export function assessShelterScope(
  input: ShelterScopeInput,
  options: { requireConfirmation?: boolean } = {},
): ShelterScopeAssessment {
  const reasons: string[] = [];
  const text = normalized(input);
  const address = value(input.address).trim().toLowerCase();

  if (input.confidentialAddress === true || /confidential|call for (?:the )?(?:address|location|directions)/i.test(address)) {
    reasons.push("Confidential or protected location");
  }
  if (isWomenOnly(input)) reasons.push("Women-only service");
  if (sensitivePatterns.some((pattern) => pattern.test(text))) {
    reasons.push("Sensitive, victim, violence, refugee, or protected-person service");
  }
  if (temporaryPatterns.some((pattern) => pattern.test(text))) {
    reasons.push("Temporary, hotel, motel, isolation, or respite location");
  }

  if (options.requireConfirmation) {
    if (input.scopeConfirmed !== true) reasons.push("Operator scope confirmation is required");
    if (!value(input.address).trim()) reasons.push("A public address is required");
    if (!value(input.phone).trim()) reasons.push("A public phone is required");
  }

  return { eligible: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function assertShelterInScope(
  input: ShelterScopeInput,
  options: { requireConfirmation?: boolean } = {},
) {
  const assessment = assessShelterScope(input, options);
  if (!assessment.eligible) {
    throw new Error(`This record is outside HavenNear's public directory scope: ${assessment.reasons.join("; ")}.`);
  }
  return assessment;
}
