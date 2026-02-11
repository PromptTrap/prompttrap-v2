import { minimatch } from 'minimatch'
import type { Config } from '../config.js'
import type { PolicyResult } from '../logging/types.js'
import path from 'path'

export class PolicyEngine {
  constructor(private config: Config) {}

  /**
   * Check if a file path is allowed based on allow/deny rules
   */
  isPathAllowed(filePath: string): PolicyResult {
    const fileConfig = this.config.tools.file

    if (!fileConfig.enabled) {
      return {
        allowed: false,
        action: 'block',
        reason: 'File tools are disabled',
      }
    }

    const normalizedPath = path.resolve(filePath)

    // Check denied paths first (deny takes precedence)
    for (const deniedPattern of fileConfig.denied_paths) {
      if (
        minimatch(normalizedPath, deniedPattern, { dot: true }) ||
        minimatch(filePath, deniedPattern, { dot: true })
      ) {
        return {
          allowed: false,
          action: 'block',
          reason: `Path matches denied pattern: ${deniedPattern}`,
        }
      }
    }

    // If allowed_paths is empty, allow all (except denied)
    if (fileConfig.allowed_paths.length === 0) {
      return {
        allowed: true,
        action: 'allow',
      }
    }

    // Check if path matches any allowed pattern
    for (const allowedPattern of fileConfig.allowed_paths) {
      if (
        normalizedPath.startsWith(allowedPattern) ||
        minimatch(normalizedPath, allowedPattern) ||
        minimatch(filePath, allowedPattern)
      ) {
        return {
          allowed: true,
          action: 'allow',
        }
      }
    }

    return {
      allowed: false,
      action: 'block',
      reason: 'Path not in allowed paths',
    }
  }

  /**
   * Evaluate a tool call against policies
   */
  evaluateToolCall(toolName: string, args: Record<string, unknown>): PolicyResult {
    // Check file path restrictions for file tools
    if (toolName === 'file_read' || toolName === 'file_write' || toolName === 'file_list') {
      const filePath = args.path as string
      if (filePath) {
        return this.isPathAllowed(filePath)
      }
    }

    // Check if web tools are enabled
    if (toolName === 'web_fetch') {
      if (!this.config.tools.web.enabled) {
        return {
          allowed: false,
          action: 'block',
          reason: 'Web tools are disabled',
        }
      }
      // TODO: Implement domain allow/deny checking
    }

    // Check if shell tools are enabled
    if (toolName === 'shell_exec') {
      if (!this.config.tools.shell.enabled) {
        return {
          allowed: false,
          action: 'block',
          reason: 'Shell tools are disabled',
        }
      }
      // TODO: Implement command allow/deny checking
    }

    // Check if database tools are enabled
    if (toolName === 'db_query') {
      if (!this.config.tools.database.enabled) {
        return {
          allowed: false,
          action: 'block',
          reason: 'Database tools are disabled',
        }
      }
    }

    return {
      allowed: true,
      action: 'allow',
    }
  }

  /**
   * Determine action based on DLP findings
   */
  getDLPAction(): 'allow' | 'warn' | 'block' {
    return this.config.dlp.action
  }
}
