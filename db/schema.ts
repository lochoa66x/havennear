import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const shelterEnrollmentRequests = sqliteTable("shelter_enrollment_requests", {
  id: text("id").primaryKey(),
  shelterId: text("shelter_id"),
  organizationName: text("organization_name").notNull(),
  city: text("city").notNull(),
  provinceCode: text("province_code").notNull(),
  contactName: text("contact_name").notNull(),
  role: text("role").notNull(),
  officialEmail: text("official_email").notNull(),
  phone: text("phone").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("pending_verification"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
