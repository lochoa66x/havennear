import { createCorrectionRequest } from "../../../db/corrections";

const correctionTypes = new Set([
  "phone",
  "hours",
  "intake",
  "eligibility",
  "services",
  "location",
  "closure_or_name",
  "other",
]);

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Please check the form and try again." }, { status: 400 });
  }

  // Quietly accept automated submissions without storing them.
  if (clean(body.website, 200)) {
    return Response.json({ ok: true, requestId: "received" });
  }

  const shelterId = clean(body.shelterId, 100);
  const correctionType = clean(body.correctionType, 40);
  const details = clean(body.details, 1200);
  const sourceUrl = clean(body.sourceUrl, 500);
  const privacyAccepted = body.privacyAccepted === true;

  if (
    !shelterId ||
    !correctionTypes.has(correctionType) ||
    details.length < 10 ||
    !privacyAccepted ||
    (sourceUrl && !/^https?:\/\//i.test(sourceUrl))
  ) {
    return Response.json({
      error: "Choose a listing and correction type, describe the public change, and confirm the privacy rule.",
    }, { status: 400 });
  }

  const id = `cor_${crypto.randomUUID()}`;
  try {
    await createCorrectionRequest({ id, shelterId, correctionType, details, sourceUrl });
    return Response.json({ ok: true, requestId: id });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "The correction could not be submitted.",
    }, { status: 400 });
  }
}
