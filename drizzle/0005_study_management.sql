-- 第 26 版第二階段：研究階段、AI 輸出紀錄、標準化紀錄情境（教師探試）、研究設定
-- 參與者的研究階段（第二年依教師：baseline/intervention/followup；第三年依學生：A/B/BC/maintain）；只增不改，保留切換歷程
CREATE TABLE `participant_phases` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `kind` text NOT NULL,
  `participant` text NOT NULL,
  `phase` text NOT NULL,
  `actor` text NOT NULL,
  `at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `participant_phases_who` ON `participant_phases` (`kind`, `participant`, `at`);
--> statement-breakpoint
-- 每一次 AI 請求：輸入、輸出全文、模型與提示詞版本、是否改用固定內容（供研究人員核對一致率）
CREATE TABLE `ai_outputs` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `task` text NOT NULL,
  `workspace` text NOT NULL,
  `subject` text NOT NULL DEFAULT '',
  `provider` text NOT NULL DEFAULT '',
  `model` text NOT NULL DEFAULT '',
  `prompt_version` text NOT NULL,
  `input_json` text NOT NULL,
  `output_text` text NOT NULL,
  `source` text NOT NULL,
  `error` text NOT NULL DEFAULT '',
  `ms` integer NOT NULL DEFAULT 0,
  `at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_outputs_task` ON `ai_outputs` (`task`, `at`);
--> statement-breakpoint
CREATE TABLE `scenario_sets` (
  `id` text PRIMARY KEY NOT NULL,
  `version` text NOT NULL,
  `title` text NOT NULL,
  `set_json` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scenario_assignments` (
  `id` text PRIMARY KEY NOT NULL,
  `set_id` text NOT NULL,
  `teacher` text NOT NULL,
  `probe` text NOT NULL,
  `phase` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scenario_decisions` (
  `assignment_id` text NOT NULL,
  `scenario_id` text NOT NULL,
  `session_no` integer NOT NULL,
  `decision` text NOT NULL,
  `changes_json` text NOT NULL,
  `direction` text NOT NULL,
  `expected` text NOT NULL,
  `reason` text NOT NULL,
  `note` text NOT NULL DEFAULT '',
  `ai_on` integer NOT NULL,
  `ai_used` integer NOT NULL,
  `raw_viewed` integer NOT NULL,
  `shown_at` integer NOT NULL,
  `saved_at` integer NOT NULL,
  `active_ms` integer NOT NULL,
  `total_ms` integer NOT NULL,
  `ai_wait_ms` integer NOT NULL,
  PRIMARY KEY(`assignment_id`, `scenario_id`, `session_no`)
);
--> statement-breakpoint
CREATE TABLE `study_config` (
  `key` text PRIMARY KEY NOT NULL,
  `value_json` text NOT NULL,
  `updated_at` integer NOT NULL
);
