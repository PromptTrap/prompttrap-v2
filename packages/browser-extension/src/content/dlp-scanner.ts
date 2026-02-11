/**
 * DLP scanning in content script
 */

import { BUILTIN_PATTERNS, type DLPFinding, type DLPPattern } from '@prompttrap/shared';

export class ContentDLPScanner {
  private patterns: DLPPattern[] = [];
  private enabled: boolean = true;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['dlpConfig']);
      const config = result.dlpConfig || {};

      // Load enabled patterns
      this.patterns = BUILTIN_PATTERNS.filter(pattern => {
        // By default, enable all except email (too noisy)
        if (pattern.name === 'email') return config.emails === true;
        return config[pattern.name] !== false;
      });

      this.enabled = config.enabled !== false;
    } catch (e) {
      console.error('[PromptTrap] Failed to load DLP config:', e);
      // Fall back to all patterns except email
      this.patterns = BUILTIN_PATTERNS.filter(p => p.name !== 'email');
    }
  }

  scan(text: string, location: string): DLPFinding[] {
    if (!this.enabled || !text) return [];

    const findings: DLPFinding[] = [];

    for (const pattern of this.patterns) {
      pattern.regex.lastIndex = 0; // Reset regex state

      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(text)) !== null) {
        const matchedText = match[0];

        // If pattern has a validator, check if match is actually valid
        if (pattern.validator && !pattern.validator(matchedText)) {
          continue;
        }

        findings.push({
          pattern: pattern.name,
          severity: pattern.severity,
          location,
          redacted_sample: this.redactMatch(matchedText),
        });
      }
    }

    return findings;
  }

  private redactMatch(match: string): string {
    if (match.length <= 8) {
      return '***';
    }
    const visible = 3;
    return match.substring(0, visible) + '***' + match.substring(match.length - visible);
  }

  async shouldWarnUser(findings: DLPFinding[]): Promise<boolean> {
    if (findings.length === 0) return false;

    const result = await chrome.storage.local.get(['dlpAction']);
    const action = result.dlpAction || 'log'; // log | warn | block

    return action === 'warn' || action === 'block';
  }

  async shouldBlockUser(findings: DLPFinding[]): Promise<boolean> {
    if (findings.length === 0) return false;

    const result = await chrome.storage.local.get(['dlpAction']);
    const action = result.dlpAction || 'log';

    return action === 'block';
  }
}
