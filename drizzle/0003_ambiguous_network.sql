CREATE INDEX `block_pair` ON `community_blocks` (`user_id`,`blocked_id`);--> statement-breakpoint
CREATE INDEX `message_scope_time` ON `community_messages` (`course_id`,`room_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `message_author_time` ON `community_messages` (`author_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `enrollment_course_user` ON `course_enrollments` (`course_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `member_room_user` ON `study_members` (`room_id`,`user_id`);