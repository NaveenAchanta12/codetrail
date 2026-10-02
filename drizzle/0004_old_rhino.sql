CREATE TABLE `study_buffer_permissions` (
	`key` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`grantee_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_buffers` (
	`key` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`code` text NOT NULL,
	`revision` integer NOT NULL,
	`shared` integer NOT NULL,
	`updated_at` integer NOT NULL
);
