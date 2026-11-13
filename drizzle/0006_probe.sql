-- 第 26 版第三階段：探試模式（題組、每次施測、每題作答歷程與計分）
CREATE TABLE `probe_sets` (
  `id` text PRIMARY KEY NOT NULL,
  `kind` text NOT NULL,
  `title` text NOT NULL,
  `set_json` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `probe_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace` text NOT NULL,
  `student` text NOT NULL,
  `set_id` text NOT NULL,
  `form_id` text NOT NULL,
  `session_no` integer,
  `phase` text NOT NULL DEFAULT '',
  `started_at` integer NOT NULL,
  `ended_at` integer,
  `status` text NOT NULL,
  `summary_json` text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE INDEX `probe_runs_student` ON `probe_runs` (`workspace`, `student`, `started_at`);
--> statement-breakpoint
CREATE TABLE `probe_items` (
  `run_id` text NOT NULL,
  `item_id` text NOT NULL,
  `idx` integer NOT NULL,
  `response_json` text NOT NULL,
  `result_json` text NOT NULL,
  `at` integer NOT NULL,
  PRIMARY KEY(`run_id`, `item_id`)
);
