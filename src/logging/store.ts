import Database from 'better-sqlite3';
import type { LogEntry } from './types.js';
import type { Config } from '../config.js';

export class AuditStore {
  private db: Database.Database | null = null;

  constructor(private config: Config) {
    if (config.logging.sqlite.enabled) {
      this.initDatabase();
    }
  }

  private initDatabase(): void {
    this.db = new Database(this.config.logging.sqlite.path);

    // Create audit log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL,
        user TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        tool_input TEXT NOT NULL,
        tool_output TEXT,
        dlp_findings TEXT NOT NULL,
        policy_result TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for common queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_session_id ON audit_log(session_id);
      CREATE INDEX IF NOT EXISTS idx_user ON audit_log(user);
      CREATE INDEX IF NOT EXISTS idx_tool_name ON audit_log(tool_name);
    `);
  }

  /**
   * Insert a log entry into the database
   */
  insert(entry: LogEntry): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO audit_log (
        timestamp, session_id, user, tool_name, tool_input,
        tool_output, dlp_findings, policy_result, latency_ms, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.timestamp,
      entry.session_id,
      entry.user,
      entry.tool_name,
      JSON.stringify(entry.tool_input),
      entry.tool_output,
      JSON.stringify(entry.dlp_findings),
      JSON.stringify(entry.policy_result),
      entry.latency_ms,
      entry.error
    );
  }

  /**
   * Get recent log entries
   */
  getRecent(limit = 100): LogEntry[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM audit_log
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];

    return rows.map(row => ({
      timestamp: row.timestamp,
      session_id: row.session_id,
      user: row.user,
      tool_name: row.tool_name,
      tool_input: JSON.parse(row.tool_input),
      tool_output: row.tool_output,
      dlp_findings: JSON.parse(row.dlp_findings),
      policy_result: JSON.parse(row.policy_result),
      latency_ms: row.latency_ms,
      error: row.error,
    }));
  }

  /**
   * Get DLP findings summary
   */
  getDLPSummary(): Array<{ pattern: string; count: number; severity: string }> {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT dlp_findings FROM audit_log
      WHERE dlp_findings != '[]'
    `);

    const rows = stmt.all() as any[];
    const summary = new Map<string, { count: number; severity: string }>();

    for (const row of rows) {
      const findings = JSON.parse(row.dlp_findings);
      for (const finding of findings) {
        const key = finding.pattern;
        const existing = summary.get(key);
        if (existing) {
          existing.count++;
        } else {
          summary.set(key, { count: 1, severity: finding.severity });
        }
      }
    }

    return Array.from(summary.entries()).map(([pattern, data]) => ({
      pattern,
      count: data.count,
      severity: data.severity,
    }));
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
