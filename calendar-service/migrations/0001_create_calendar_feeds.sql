CREATE TABLE IF NOT EXISTS calendar_feeds (
  id TEXT PRIMARY KEY,
  update_token_hash TEXT NOT NULL,
  calendar_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_feeds_expires_at
ON calendar_feeds (expires_at);
