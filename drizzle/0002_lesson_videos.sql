CREATE TABLE `lesson_videos` (
  `id` text PRIMARY KEY NOT NULL,
  `owner` text NOT NULL,
  `mime` text NOT NULL,
  `size` integer NOT NULL,
  `chunks` integer NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lesson_video_chunks` (
  `video_id` text NOT NULL,
  `idx` integer NOT NULL,
  `data` blob NOT NULL,
  PRIMARY KEY(`video_id`, `idx`)
);
