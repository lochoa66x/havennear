import { createEnrollmentRequest } from "../../../db/enrollments";

const provinces = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]);

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

  const organizationName = clean(body.organizationName, 160);
  const city = clean(body.city, 100);
  const provinceCode = clean(body.provinceCode, 2).toUpperCase();
  const contactName = clean(body.contactName, 120);
  const role = clean(body.role, 120);
  const officialEmail = clean(body.officialEmail, 180).toLowerCase();
  const phone = clean(body.phone, 40);
  const notes = clean(body.notes, 1200);
  const shelterId = clean(body.shelterId, 100);
  const authorized = body.authorized === true;
  const privacyAccepted = body.privacyAccepted === true;

  if (
    !organizationName ||
    !city ||
    !provinces.has(provinceCode) ||
    !contactName ||
    !role ||
    !officialEmail.includes("@") ||
    !phone ||
    !authorized ||
    !privacyAccepted
  ) {
    return Response.json({ error: "Please complete every required field." }, { status: 400 });
  }

  const id = `enr_${crypto.randomUUID()}`;
  await createEnrollmentRequest({
    id,
    shelterId,
    organizationName,
    city,
    provinceCode,
    contactName,
    role,
    officialEmail,
    phone,
    notes,
  });

  return Response.json({ ok: true, requestId: id });
}
