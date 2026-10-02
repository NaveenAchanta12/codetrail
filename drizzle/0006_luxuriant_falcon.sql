CREATE TABLE `learner_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`public_name` text NOT NULL,
	`location` text NOT NULL,
	`discoverable` integer NOT NULL,
	`share_location` integer NOT NULL,
	`share_photo` integer NOT NULL,
	`personalize` integer NOT NULL,
	`photo_key` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learner_preferences_public_id_unique` ON `learner_preferences` (`public_id`);--> statement-breakpoint
CREATE TABLE `recommendation_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`course_id` text NOT NULL,
	`query` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `signals_user_time` ON `recommendation_signals` (`user_id`,`created_at`);