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

      // Check domain restrictions
      const url = args.url as string
      if (url) {
        const domainCheck = this.isDomainAllowed(url)
        if (!domainCheck.allowed) {
          return domainCheck
        }
      }
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
   * Check if a domain is allowed based on allow/deny rules
   */
  isDomainAllowed(urlString: string): PolicyResult {
    const webConfig = this.config.tools.web

    let hostname: string
    try {
      const url = new URL(urlString)
      hostname = url.hostname
    } catch {
      return {
        allowed: false,
        action: 'block',
        reason: 'Invalid URL',
      }
    }

    // Check denied domains first (deny takes precedence)
    for (const deniedPattern of webConfig.denied_domains) {
      if (this.matchDomain(hostname, deniedPattern)) {
        return {
          allowed: false,
          action: 'block',
          reason: `Domain matches denied pattern: ${deniedPattern}`,
        }
      }
    }

    // If allowed_domains is empty, allow all (except denied)
    if (webConfig.allowed_domains.length === 0) {
      return {
        allowed: true,
        action: 'allow',
      }
    }

    // Check if domain matches any allowed pattern
    for (const allowedPattern of webConfig.allowed_domains) {
      if (this.matchDomain(hostname, allowedPattern)) {
        return {
          allowed: true,
          action: 'allow',
        }
      }
    }

    return {
      allowed: false,
      action: 'block',
      reason: 'Domain not in allowed domains',
    }
  }

  /**
   * Match a hostname against a pattern (supports wildcards)
   */
  private matchDomain(hostname: string, pattern: string): boolean {
    // Convert pattern to regex
    // *.example.com -> ^.*\.example\.com$
    // example.com -> ^example\.com$
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')
    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(hostname)
  }

  /**
   * Determine action based on DLP findings
   */
  getDLPAction(): 'allow' | 'warn' | 'block' {
    return this.config.dlp.action
  }
}
