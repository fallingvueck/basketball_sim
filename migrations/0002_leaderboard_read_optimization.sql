-- BasketballLife D1 leaderboard read optimization
-- Run once after 0001. Designed for the Workers Free daily quota:
-- backfill first, then create only the eight award indexes that remove the
-- most expensive json_each leaderboard scans. Native numeric metrics can be
-- indexed later if their real rows_read warrants it.

ALTER TABLE career_records ADD COLUMN mvp_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE career_records ADD COLUMN fmvp_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE career_records ADD COLUMN dpoy_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE career_records ADD COLUMN first_team_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE career_records ADD COLUMN allstar_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE career_records ADD COLUMN scoring_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE career_records ADD COLUMN assists_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE career_records ADD COLUMN rebounds_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE career_records ADD COLUMN hof_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE career_records ADD COLUMN jersey_count INTEGER NOT NULL DEFAULT 0;

-- Scan each career's awards JSON once and fill all award counters together.
UPDATE career_records
SET (
  mvp_count,
  fmvp_count,
  dpoy_count,
  first_team_count,
  allstar_count,
  scoring_count,
  assists_count,
  rebounds_count
) = (
  SELECT
    COALESCE(SUM(CASE WHEN CAST(value AS TEXT) LIKE '%年度MVP%' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN CAST(value AS TEXT) LIKE '%總冠軍賽MVP%' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN CAST(value AS TEXT) LIKE '%最佳防守球員%' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN CAST(value AS TEXT) LIKE '%年度第一隊%' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN CAST(value AS TEXT) LIKE '%明星賽%' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN CAST(value AS TEXT) LIKE '%得分王%' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN CAST(value AS TEXT) LIKE '%助攻王%' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN CAST(value AS TEXT) LIKE '%籃板王%' THEN 1 ELSE 0 END), 0)
  FROM json_each(career_records.awards)
),
hof_count = CASE WHEN json_valid(hall_of_fame) THEN json_array_length(hall_of_fame) ELSE 0 END,
jersey_count = CASE WHEN json_valid(jersey_retired) THEN json_array_length(jersey_retired) ELSE 0 END;

-- Materialize the four totals shown above every leaderboard. Without this,
-- switching metrics repeats COUNT(DISTINCT user_id) across all 6,930 V7 rows.
CREATE TABLE IF NOT EXISTS leaderboard_stats (
  board_key TEXT PRIMARY KEY,
  players INTEGER NOT NULL DEFAULT 0,
  careers INTEGER NOT NULL DEFAULT 0,
  top_power INTEGER NOT NULL DEFAULT 0,
  top_peak INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO leaderboard_stats(board_key,players,careers,top_power,top_peak,updated_at)
SELECT
  'v750',
  COUNT(DISTINCT user_id),
  COUNT(*),
  COALESCE(MAX(career_rating),0),
  COALESCE(MAX(peak_overall),0),
  CURRENT_TIMESTAMP
FROM career_records
WHERE is_public=1 AND ranking_era='v750' AND weekly_active=0 AND weekly_id='';

INSERT OR REPLACE INTO leaderboard_stats(board_key,players,careers,top_power,top_peak,updated_at)
SELECT
  'v8',
  COUNT(DISTINCT user_id),
  COUNT(*),
  COALESCE(MAX(career_rating),0),
  COALESCE(MAX(peak_overall),0),
  CURRENT_TIMESTAMP
FROM career_records
WHERE is_public=1 AND ranking_era='v8' AND weekly_active=0 AND weekly_id='';

INSERT OR REPLACE INTO leaderboard_stats(board_key,players,careers,top_power,top_peak,updated_at)
SELECT
  'weekly:' || weekly_id,
  COUNT(DISTINCT user_id),
  COUNT(*),
  COALESCE(MAX(career_rating),0),
  COALESCE(MAX(peak_overall),0),
  CURRENT_TIMESTAMP
FROM career_records
WHERE is_public=1 AND ranking_era='v8' AND weekly_active=1 AND weekly_id<>''
GROUP BY weekly_id;

-- The existing idx_careers_board becomes useful for POWER once non-weekly
-- queries also constrain weekly_id=''. These eight indexes target the former
-- json_each metrics, where the read amplification was worst.
CREATE INDEX IF NOT EXISTS idx_board_mvp ON career_records(is_public,ranking_era,weekly_active,mvp_count DESC,career_rating DESC);
CREATE INDEX IF NOT EXISTS idx_board_fmvp ON career_records(is_public,ranking_era,weekly_active,fmvp_count DESC,career_rating DESC);
CREATE INDEX IF NOT EXISTS idx_board_dpoy ON career_records(is_public,ranking_era,weekly_active,dpoy_count DESC,career_rating DESC);
CREATE INDEX IF NOT EXISTS idx_board_first ON career_records(is_public,ranking_era,weekly_active,first_team_count DESC,career_rating DESC);
CREATE INDEX IF NOT EXISTS idx_board_allstar ON career_records(is_public,ranking_era,weekly_active,allstar_count DESC,career_rating DESC);
CREATE INDEX IF NOT EXISTS idx_board_scoring ON career_records(is_public,ranking_era,weekly_active,scoring_count DESC,career_rating DESC);
CREATE INDEX IF NOT EXISTS idx_board_assists ON career_records(is_public,ranking_era,weekly_active,assists_count DESC,career_rating DESC);
CREATE INDEX IF NOT EXISTS idx_board_rebounds ON career_records(is_public,ranking_era,weekly_active,rebounds_count DESC,career_rating DESC);
