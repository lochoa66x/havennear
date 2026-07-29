import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const shelters = sqliteTable("shelters", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  legalName: text("legal_name"),
  name: text("name").notNull(),
  alternateNamesJson: text("alternate_names_json").notNull().default("[]"),
  shelterType: text("shelter_type").notNull().default("Emergency shelter"),
  address: text("address"),
  city: text("city").notNull(),
  provinceCode: text("province_code").notNull(),
  postalCode: text("postal_code"),
  countryCode: text("country_code").notNull().default("CA"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  confidentialAddress: integer("confidential_address", { mode: "boolean" }).notNull().default(false),
  phone: text("phone").notNull(),
  phoneDisplay: text("phone_display").notNull(),
  publicEmail: text("public_email"),
  website: text("website"),
  hours: text("hours").notNull(),
  intake: text("intake").notNull(),
  groupsJson: text("groups_json").notNull().default("[]"),
  servicesJson: text("services_json").notNull().default("[]"),
  accessibilityJson: text("accessibility_json").notNull().default("[]"),
  languagesJson: text("languages_json").notNull().default("[]"),
  totalBeds: integer("total_beds"),
  participationState: text("participation_state").notNull().default("directory"),
  publicationState: text("publication_state").notNull().default("draft"),
  availabilityStatus: text("availability_status").notNull().default("call"),
  spacesAvailable: integer("spaces_available"),
  availabilityUpdatedAt: integer("availability_updated_at", { mode: "timestamp_ms" }),
  availabilityExpiresAt: integer("availability_expires_at", { mode: "timestamp_ms" }),
  note: text("note").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const shelterSources = sqliteTable("shelter_sources", {
  id: text("id").primaryKey(),
  shelterId: text("shelter_id"),
  stagingRecordId: text("staging_record_id"),
  sourceOrganization: text("source_organization").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  sourceType: text("source_type").notNull().default("official_website"),
  licence: text("licence"),
  publicationDate: text("publication_date"),
  retrievedAt: integer("retrieved_at", { mode: "timestamp_ms" }).notNull(),
  verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
  fieldsSupportedJson: text("fields_supported_json").notNull().default("[]"),
  status: text("status").notNull().default("active"),
});

export const shelterExternalIdentifiers = sqliteTable("shelter_external_identifiers", {
  id: text("id").primaryKey(),
  shelterId: text("shelter_id").notNull(),
  sourceSystem: text("source_system").notNull(),
  externalId: text("external_id").notNull(),
  sourceVersion: text("source_version"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const directoryImportBatches = sqliteTable("directory_import_batches", {
  id: text("id").primaryKey(),
  datasetName: text("dataset_name").notNull(),
  publisher: text("publisher").notNull(),
  datasetVersion: text("dataset_version"),
  sourceUrl: text("source_url").notNull(),
  licence: text("licence"),
  fileName: text("file_name").notNull(),
  checksum: text("checksum").notNull(),
  importedAt: integer("imported_at", { mode: "timestamp_ms" }).notNull(),
  totalRows: integer("total_rows").notNull().default(0),
  acceptedRows: integer("accepted_rows").notNull().default(0),
  rejectedRows: integer("rejected_rows").notNull().default(0),
  duplicateCandidates: integer("duplicate_candidates").notNull().default(0),
  status: text("status").notNull().default("staged"),
  createdBy: text("created_by").notNull(),
});

export const directoryStagingRecords = sqliteTable("directory_staging_records", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  sourceRowJson: text("source_row_json").notNull(),
  parsedJson: text("parsed_json").notNull(),
  validationWarningsJson: text("validation_warnings_json").notNull().default("[]"),
  duplicateCandidatesJson: text("duplicate_candidates_json").notNull().default("[]"),
  reviewerNotes: text("reviewer_notes").notNull().default(""),
  reviewState: text("review_state").notNull().default("pending"),
  approvedShelterId: text("approved_shelter_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
});

export const directoryReviewActivity = sqliteTable("directory_review_activity", {
  id: text("id").primaryKey(),
  shelterId: text("shelter_id"),
  stagingRecordId: text("staging_record_id"),
  action: text("action").notNull(),
  actorEmail: text("actor_email").notNull(),
  changedFieldsJson: text("changed_fields_json").notNull().default("[]"),
  reason: text("reason").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const platformOperators = sqliteTable("platform_operators", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("owner"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const shelterStaffAccess = sqliteTable("shelter_staff_access", {
  id: text("id").primaryKey(),
  shelterId: text("shelter_id").notNull(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  role: text("role").notNull().default("editor"),
  status: text("status").notNull().default("active"),
  grantedBy: text("granted_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
});

export const shelterAvailabilityUpdates = sqliteTable("shelter_availability_updates", {
  id: text("id").primaryKey(),
  shelterId: text("shelter_id").notNull(),
  status: text("status").notNull(),
  spacesAvailable: integer("spaces_available"),
  validForMinutes: integer("valid_for_minutes").notNull(),
  hours: text("hours").notNull(),
  intake: text("intake").notNull(),
  groupsJson: text("groups_json").notNull().default("[]"),
  servicesJson: text("services_json").notNull().default("[]"),
  updatedBy: text("updated_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
});

export const shelterCorrectionRequests = sqliteTable("shelter_correction_requests", {
  id: text("id").primaryKey(),
  shelterId: text("shelter_id").notNull(),
  correctionType: text("correction_type").notNull(),
  details: text("details").notNull(),
  sourceUrl: text("source_url"),
  status: text("status").notNull().default("pending_review"),
  reviewerNote: text("reviewer_note").notNull().default(""),
  reviewedBy: text("reviewed_by"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
});
