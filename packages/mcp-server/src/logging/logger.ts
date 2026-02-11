import type { Config } from '../config.js'
import type { LogEntry } from './types.js'
import type { AuditStore } from './store.js'

export class Logger {
  constructor(
    private config: Config,
    private auditStore?: AuditStore
  ) {}

  log(entry: LogEntry): void {
    if (this.config.logging.stdout) {
      // Output structured JSON to stdout
      console.log(JSON.stringify(entry))
    }

    // Write to SQLite if enabled
    if (this.auditStore) {
      this.auditStore.insert(entry)
    }
  }

  /**
   * Truncate or hash sensitive output for logging
   */
  sanitizeOutput(output: string, maxLength = 500): string {
    if (output.length <= maxLength) {
      return output
    }
    return output.substring(0, maxLength) + `... [truncated ${output.length - maxLength} chars]`
  }
}
