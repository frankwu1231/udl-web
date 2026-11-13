-- 第 26 版：研究紀錄存進網站資料庫（只存代號，不存姓名）
CREATE TABLE `research_events` (
  `rid` text PRIMARY KEY NOT NULL,
  `workspace` text NOT NULL,
  `student` text NOT NULL,
  `session_no` integer,
  `sheet` text NOT NULL,
  `time` text NOT NULL,
  `data_json` text NOT NULL,
  `received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `research_events_student` ON `research_events` (`workspace`, `student`, `session_no`);
--> statement-breakpoint
CREATE TABLE `research_sessions` (
  `workspace` text NOT NULL,
  `student` text NOT NULL,
  `no` integer NOT NULL,
  `started_at` integer NOT NULL,
  `class_code` text NOT NULL DEFAULT '',
  `device` text NOT NULL DEFAULT '',
  PRIMARY KEY(`workspace`, `student`, `no`)
);
--> statement-breakpoint
CREATE TABLE `student_settings` (
  `workspace` text NOT NULL,
  `student` text NOT NULL,
  `act` text NOT NULL,
  `settings_json` text NOT NULL,
  `updated_at` integer NOT NULL,
  PRIMARY KEY(`workspace`, `student`, `act`)
);
--> statement-breakpoint
CREATE TABLE `setting_changes` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `workspace` text NOT NULL,
  `student` text NOT NULL,
  `act` text NOT NULL,
  `session_no` integer,
  `field` text NOT NULL,
  `before_value` text NOT NULL,
  `after_value` text NOT NULL,
  `direction` text NOT NULL,
  `reason` text NOT NULL,
  `note` text NOT NULL DEFAULT '',
  `actor` text NOT NULL,
  `at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `setting_changes_student` ON `setting_changes` (`workspace`, `student`, `at`);
