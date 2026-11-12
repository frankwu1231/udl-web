-- 第 26 版第四階段：小老師小方的支持階段（示範 demo → 陪做 guided → 撤除 faded），每位學生每個活動一筆，另留變更歷程
CREATE TABLE `tutor_stages` (
  `workspace` text NOT NULL,
  `student` text NOT NULL,
  `act` text NOT NULL,
  `stage` text NOT NULL,
  `since_session` integer NOT NULL,
  `evaluated_through` integer NOT NULL,
  `updated_at` integer NOT NULL,
  PRIMARY KEY(`workspace`, `student`, `act`)
);
--> statement-breakpoint
CREATE TABLE `tutor_stage_changes` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `workspace` text NOT NULL,
  `student` text NOT NULL,
  `act` text NOT NULL,
  `from_stage` text NOT NULL,
  `to_stage` text NOT NULL,
  `session_no` integer NOT NULL,
  `reason` text NOT NULL,
  `detail_json` text NOT NULL DEFAULT '{}',
  `at` integer NOT NULL
);
