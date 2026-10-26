CREATE TABLE `lesson_documents` (
  `kind` text PRIMARY KEY NOT NULL,
  `config_json` text NOT NULL,
  `revision` integer NOT NULL DEFAULT 1,
  `updated_at` text NOT NULL
);
