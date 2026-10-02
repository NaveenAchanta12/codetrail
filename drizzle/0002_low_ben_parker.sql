CREATE TABLE `community_blocks` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`blocked_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `community_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`room_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `community_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`handle` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_profiles_public_id_unique` ON `community_profiles` (`public_id`);--> statement-breakpoint
CREATE TABLE `community_reports` (
	`key` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`message_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `course_enrollments` (
	`key` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`user_id` text NOT NULL,
	`discoverable` integer NOT NULL,
	`joined_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`pair_key` text NOT NULL,
	`course_id` text NOT NULL,
	`requester` text NOT NULL,
	`target` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_connections_pair_key_unique` ON `study_connections` (`pair_key`);--> statement-breakpoint
CREATE TABLE `study_members` (
	`key` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`language` text NOT NULL,
	`code` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`closed` integer NOT NULL
);
