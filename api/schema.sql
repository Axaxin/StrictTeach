-- VocabMaster D1 Database Schema
-- 创建命令: npx wrangler d1 execute vocabmaster-db --file=./schema.sql

-- 答题记录表
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT DEFAULT 'default',        -- 用户ID（预留多用户支持）
  word_id TEXT NOT NULL,                  -- 单词ID (如 "starter-0")
  word_term TEXT NOT NULL,               -- 单词文本 (如 "apple")
  question_type TEXT NOT NULL,          -- 题型: EN_TO_CN, CN_TO_EN, SPELLING
  is_correct INTEGER NOT NULL,          -- 0=错误, 1=正确
  time_spent INTEGER NOT NULL,          -- 答题用时（毫秒）
  user_answer TEXT,                      -- 用户答案
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_word_id (word_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- 单词熟练度表
CREATE TABLE IF NOT EXISTS mastery (
  word_id TEXT PRIMARY KEY,
  word_term TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  mastery_level INTEGER DEFAULT 0,      -- 熟练度 0-100
  attempt_count INTEGER DEFAULT 0,       -- 总答题次数
  correct_count INTEGER DEFAULT 0,       -- 正确次数
  total_time_spent INTEGER DEFAULT 0,   -- 总用时（毫秒）
  last_attempt_at DATETIME,
  last_correct_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mastery_level (mastery_level),
  INDEX idx_unit_id (unit_id)
);

-- 用户学习统计表（可选）
CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  total_attempts INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0,
  unique_words_practiced INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_practice_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
