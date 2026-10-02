CREATE TABLE `study_room_focus` (
	`room_id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`problem_index` integer NOT NULL,
	`updated_at` integer NOT NULL
);
