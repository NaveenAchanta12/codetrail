import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const courseProgress=sqliteTable('course_progress',{
 userId:text('user_id').primaryKey(),
 stateJson:text('state_json').notNull(),
 revision:integer('revision').notNull(),
 updatedAt:integer('updated_at').notNull()
});
export const academyState=sqliteTable('academy_state',{
 userId:text('user_id').primaryKey(),
 stateJson:text('state_json').notNull(),
 revision:integer('revision').notNull(),
 updatedAt:integer('updated_at').notNull()
});
export const communityProfiles=sqliteTable('community_profiles',{userId:text('user_id').primaryKey(),publicId:text('public_id').notNull().unique(),handle:text('handle').notNull()});
export const courseEnrollments=sqliteTable('course_enrollments',{key:text('key').primaryKey(),courseId:text('course_id').notNull(),userId:text('user_id').notNull(),discoverable:integer('discoverable').notNull(),joinedAt:integer('joined_at').notNull()},t=>[index('enrollment_course_user').on(t.courseId,t.userId)]);
export const studyConnections=sqliteTable('study_connections',{id:text('id').primaryKey(),pairKey:text('pair_key').notNull().unique(),courseId:text('course_id').notNull(),requester:text('requester').notNull(),target:text('target').notNull(),status:text('status').notNull(),createdAt:integer('created_at').notNull()});
export const studyRooms=sqliteTable('study_rooms',{id:text('id').primaryKey(),courseId:text('course_id').notNull(),ownerId:text('owner_id').notNull(),title:text('title').notNull(),language:text('language').notNull(),code:text('code').notNull(),revision:integer('revision').notNull(),updatedAt:integer('updated_at').notNull(),closed:integer('closed').notNull()});
export const studyMembers=sqliteTable('study_members',{key:text('key').primaryKey(),roomId:text('room_id').notNull(),userId:text('user_id').notNull(),role:text('role').notNull()},t=>[index('member_room_user').on(t.roomId,t.userId)]);
export const communityMessages=sqliteTable('community_messages',{id:text('id').primaryKey(),courseId:text('course_id').notNull(),roomId:text('room_id').notNull(),authorId:text('author_id').notNull(),body:text('body').notNull(),createdAt:integer('created_at').notNull(),deleted:integer('deleted').notNull()},t=>[index('message_scope_time').on(t.courseId,t.roomId,t.createdAt),index('message_author_time').on(t.authorId,t.createdAt)]);
export const communityBlocks=sqliteTable('community_blocks',{key:text('key').primaryKey(),userId:text('user_id').notNull(),blockedId:text('blocked_id').notNull()},t=>[index('block_pair').on(t.userId,t.blockedId)]);
export const communityReports=sqliteTable('community_reports',{key:text('key').primaryKey(),reporterId:text('reporter_id').notNull(),messageId:text('message_id').notNull(),reason:text('reason').notNull(),createdAt:integer('created_at').notNull()});
export const studyBuffers=sqliteTable('study_buffers',{key:text('key').primaryKey(),roomId:text('room_id').notNull(),ownerId:text('owner_id').notNull(),code:text('code').notNull(),revision:integer('revision').notNull(),shared:integer('shared').notNull(),updatedAt:integer('updated_at').notNull()});
export const studyBufferPermissions=sqliteTable('study_buffer_permissions',{key:text('key').primaryKey(),roomId:text('room_id').notNull(),ownerId:text('owner_id').notNull(),granteeId:text('grantee_id').notNull()});
export const studyRoomFocus=sqliteTable('study_room_focus',{roomId:text('room_id').primaryKey(),lessonId:text('lesson_id').notNull(),problemIndex:integer('problem_index').notNull(),updatedAt:integer('updated_at').notNull()});
export const learnerPreferences=sqliteTable('learner_preferences',{userId:text('user_id').primaryKey(),publicId:text('public_id').notNull().unique(),publicName:text('public_name').notNull(),publicNameSearch:text('public_name_search').notNull().default(''),location:text('location').notNull(),locationSearch:text('location_search').notNull().default(''),discoverable:integer('discoverable').notNull(),shareLocation:integer('share_location').notNull(),sharePhoto:integer('share_photo').notNull(),personalize:integer('personalize').notNull(),recEpoch:integer('rec_epoch').notNull().default(0),preferenceRev:integer('preference_rev').notNull().default(0),photoKey:text('photo_key'),photoRev:integer('photo_rev').notNull().default(0),updatedAt:integer('updated_at').notNull()});
export const recommendationSignals=sqliteTable('recommendation_signals',{id:text('id').primaryKey(),userId:text('user_id').notNull(),kind:text('kind').notNull(),courseId:text('course_id').notNull(),query:text('query').notNull(),createdAt:integer('created_at').notNull()},t=>[index('signals_user_time').on(t.userId,t.createdAt)]);
