#!/usr/bin/env node
/**
 * Native messaging host for PromptTrap browser extension
 * Receives events from the extension and writes to SQLite database
 */

import Database from 'better-sqlite3';
import { SCHEMA_SQL } from '@prompttrap/shared';
import type { BrowserEvent } from '@prompttrap/shared';

class NativeMessagingHost {
  private db: Database.Database;

  constructor() {
    // Read config from environment or default location
    const dbPath = process.env.PROMPTTRAP_DB || './prompttrap.db';
    this.db = new Database(dbPath);

    // Initialize schema if needed
    this.db.exec(SCHEMA_SQL);

    this.start();
  }

  private start(): void {
    // Native messaging uses stdin/stdout
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read();
      if (chunk) {
        this.handleMessage(chunk);
      }
    });

    process.stdin.on('end', () => {
      this.db.close();
      process.exit(0);
    });

    this.sendMessage({ type: 'ready' });
  }

  private handleMessage(buffer: Buffer): void {
    try {
      // Native messaging format: 4-byte length prefix + JSON
      const messageLength = buffer.readUInt32LE(0);
      const messageData = buffer.slice(4, 4 + messageLength).toString('utf-8');
      const message = JSON.parse(messageData);

      if (message.type === 'audit_event') {
        this.handleAuditEvent(message.event);
      }
    } catch (e) {
      this.sendMessage({ type: 'error', error: (e as Error).message });
    }
  }

  private handleAuditEvent(event: BrowserEvent): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO events (
          timestamp, source, event_type, user_id, session_id,
          domain, ai_service, action, input_length, duration_seconds,
          dlp_findings, dlp_severity, dlp_action_taken
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        event.timestamp,
        event.source,
        event.event_type,
        event.user_id || null,
        event.session_id,
        event.domain,
        event.ai_service,
        event.action,
        event.input_length || null,
        event.duration_seconds || null,
        JSON.stringify(event.dlp_findings),
        event.dlp_severity,
        event.dlp_action_taken
      );

      this.sendMessage({ type: 'success', event_id: this.db.lastInsertRowid });
    } catch (e) {
      this.sendMessage({ type: 'error', error: (e as Error).message });
    }
  }

  private sendMessage(message: any): void {
    const json = JSON.stringify(message);
    const buffer = Buffer.alloc(4 + json.length);

    buffer.writeUInt32LE(json.length, 0);
    buffer.write(json, 4);

    process.stdout.write(buffer);
  }
}

// Start the native messaging host
new NativeMessagingHost();
