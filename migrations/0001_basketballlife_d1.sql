PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  nickname TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS career_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  player_name TEXT NOT NULL,
  position TEXT NOT NULL,
  seed TEXT NOT NULL,
  seed_tier TEXT NOT NULL DEFAULT '',
  retired_age INTEGER NOT NULL,
  final_year INTEGER NOT NULL,
  peak_overall INTEGER NOT NULL,
  career_rating INTEGER NOT NULL,
  career_games INTEGER NOT NULL,
  career_salary INTEGER NOT NULL,
  championships INTEGER NOT NULL DEFAULT 0,
  national_caps INTEGER NOT NULL DEFAULT 0,
  hall_of_fame TEXT NOT NULL DEFAULT '[]',
  jersey_retired TEXT NOT NULL DEFAULT '[]',
  awards TEXT NOT NULL DEFAULT '[]',
  titles TEXT NOT NULL DEFAULT '[]',
  league_summary TEXT NOT NULL DEFAULT '{}',
  season_history TEXT NOT NULL DEFAULT '[]',
  career_data TEXT NOT NULL DEFAULT '{}',
  ranking_era TEXT NOT NULL DEFAULT 'v8',
  publisher_version TEXT NOT NULL DEFAULT '',
  upload_id TEXT NOT NULL DEFAULT '',
  weekly_active INTEGER NOT NULL DEFAULT 0,
  weekly_id TEXT NOT NULL DEFAULT '',
  weekly_label TEXT NOT NULL DEFAULT '',
  server_verified TEXT NOT NULL DEFAULT '',
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(user_id)
);

CREATE INDEX IF NOT EXISTS idx_careers_power ON career_records(is_public, career_rating DESC);
CREATE INDEX IF NOT EXISTS idx_careers_peak ON career_records(is_public, peak_overall DESC);
CREATE INDEX IF NOT EXISTS idx_careers_user ON career_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_careers_year ON career_records(final_year DESC);
CREATE INDEX IF NOT EXISTS idx_careers_board ON career_records(is_public, ranking_era, weekly_active, weekly_id, career_rating DESC);

CREATE TABLE IF NOT EXISTS global_news (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  player_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  importance INTEGER NOT NULL,
  message TEXT NOT NULL,
  league TEXT NOT NULL DEFAULT '',
  career_year INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(user_id)
);

CREATE INDEX IF NOT EXISTS idx_news_created ON global_news(created_at DESC);
