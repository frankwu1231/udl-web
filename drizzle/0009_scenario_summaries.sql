-- 第 29 版：情境探試的 AI 摘要先產生、主持人審核後固定，每位老師看到同一段文字
CREATE TABLE IF NOT EXISTS scenario_summaries (
  set_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  up_to INTEGER NOT NULL,
  text TEXT NOT NULL,
  source TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  prompt_version TEXT NOT NULL DEFAULT '',
  ai_output_id INTEGER,
  edited INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at INTEGER NOT NULL,
  approved_at INTEGER,
  approved_by TEXT,
  PRIMARY KEY (set_id, scenario_id, up_to)
);
