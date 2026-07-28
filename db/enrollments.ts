import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "./index";
import { shelterEnrollmentRequests } from "./schema";

export type NewEnrollmentRequest = {
  id: string;
  shelterId?: string;
  organizationName: string;
  city: string;
  provinceCode: string;
  contactName: string;
  role: string;
  officialEmail: string;
  phone: string;
  notes?: string;
};

export async function createEnrollmentRequest(request: NewEnrollmentRequest) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS shelter_enrollment_requests (
      id TEXT PRIMARY KEY NOT NULL,
      shelter_id TEXT,
      organization_name TEXT NOT NULL,
      city TEXT NOT NULL,
      province_code TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      role TEXT NOT NULL,
      official_email TEXT NOT NULL,
      phone TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending_verification',
      created_at INTEGER NOT NULL
    )
  `).run();

  await getDb().insert(shelterEnrollmentRequests).values({
    ...request,
    shelterId: request.shelterId || null,
    notes: request.notes || "",
    status: "pending_verification",
    createdAt: new Date(),
  });

  return getDb()
    .select({
      id: shelterEnrollmentRequests.id,
      status: shelterEnrollmentRequests.status,
      createdAt: shelterEnrollmentRequests.createdAt,
    })
    .from(shelterEnrollmentRequests)
    .where(eq(shelterEnrollmentRequests.id, request.id))
    .get();
}
