CREATE TABLE `test_login_attempts` (
  `visitor_key` text PRIMARY KEY NOT NULL,
  `failures` integer NOT NULL,
  `reset_at` integer NOT NULL
);
CREATE TABLE `test_ai_usage` (
  `day` text PRIMARY KEY NOT NULL,
  `calls` integer NOT NULL
);
