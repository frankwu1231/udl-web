-- 第 29 版：本節作廢（設備當機、學生身體不適等）。原始紀錄保留，只是不算進應有方向、支持階段和跨節摘要。
ALTER TABLE `research_sessions` ADD `invalid_reason` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `research_sessions` ADD `invalid_note` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `research_sessions` ADD `invalid_at` integer;
--> statement-breakpoint
ALTER TABLE `research_sessions` ADD `invalid_by` text NOT NULL DEFAULT '';
