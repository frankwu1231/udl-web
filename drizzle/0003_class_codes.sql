CREATE TABLE `class_codes` (
  `code` text PRIMARY KEY NOT NULL,
  `workspace` text NOT NULL,
  `label` text NOT NULL,
  `created_at` integer NOT NULL,
  `expires_at` integer NOT NULL,
  `revoked` integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `class_codes_workspace` ON `class_codes` (`workspace`);
--> statement-breakpoint
CREATE TABLE `ai_usage` (
  `day` text NOT NULL,
  `scope` text NOT NULL,
  `calls` integer NOT NULL,
  PRIMARY KEY(`day`, `scope`)
);
