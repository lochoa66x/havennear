CREATE TABLE `shelter_enrollment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`shelter_id` text,
	`organization_name` text NOT NULL,
	`city` text NOT NULL,
	`province_code` text NOT NULL,
	`contact_name` text NOT NULL,
	`role` text NOT NULL,
	`official_email` text NOT NULL,
	`phone` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending_verification' NOT NULL,
	`created_at` integer NOT NULL
);
