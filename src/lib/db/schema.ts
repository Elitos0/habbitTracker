/** SQLite schema for the Habit Tracker local database. */

export const SCHEMA_VERSION = 2;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS local_profile (
  id TEXT PRIMARY KEY,
  app_language TEXT NOT NULL DEFAULT 'ru',
  timezone TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  icon TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS habit_tags (
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (habit_id, tag_id)
);

CREATE TABLE IF NOT EXISTS habit_schedules (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL,
  interval_days INTEGER,
  weekdays TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  times_per_day INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS habit_checklist_items (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  slot_type TEXT,
  scheduled_time TEXT,
  is_required INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS completion_records (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL,
  completion_status TEXT NOT NULL DEFAULT 'none',
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(habit_id, local_date)
);

CREATE TABLE IF NOT EXISTS sub_item_completions (
  id TEXT PRIMARY KEY,
  completion_record_id TEXT NOT NULL REFERENCES completion_records(id) ON DELETE CASCADE,
  checklist_item_id TEXT NOT NULL REFERENCES habit_checklist_items(id) ON DELETE CASCADE,
  is_done INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS reminder_rules (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  time_of_day TEXT NOT NULL,
  weekday INTEGER,
  interval_days INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const SEED_SCHEMA_VERSION_SQL = `
INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');
`;
