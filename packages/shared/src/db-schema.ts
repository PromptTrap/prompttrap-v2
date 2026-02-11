/**
 * Shared SQLite schema for audit events
 */

export const SCHEMA_SQL = `
-- Core events table — every event from both sources
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL,           -- 'mcp' | 'browser'
  event_type TEXT NOT NULL,       -- 'tool_call' | 'ai_visit' | 'paste' | 'upload' | 'text_input'
  user_id TEXT,
  session_id TEXT,

  -- MCP-specific fields
  tool_name TEXT,                 -- e.g., 'file_read', 'web_fetch'
  tool_input TEXT,                -- JSON of tool parameters
  tool_output_hash TEXT,          -- SHA256 of output
  policy_result TEXT,             -- 'allowed' | 'warned' | 'blocked'
  latency_ms INTEGER,

  -- Browser-specific fields
  domain TEXT,                    -- e.g., 'chatgpt.com'
  ai_service TEXT,                -- e.g., 'ChatGPT', 'Claude', 'Gemini'
  action TEXT,                    -- 'page_visit' | 'text_input' | 'paste' | 'file_upload'
  input_length INTEGER,           -- character count
  duration_seconds INTEGER,       -- time spent on AI service

  -- DLP fields (shared)
  dlp_findings TEXT,              -- JSON array of findings
  dlp_severity TEXT,              -- 'none' | 'low' | 'medium' | 'high' | 'critical'
  dlp_action_taken TEXT           -- 'logged' | 'warned' | 'blocked'
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(dlp_severity);
CREATE INDEX IF NOT EXISTS idx_events_domain ON events(domain);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
`;
