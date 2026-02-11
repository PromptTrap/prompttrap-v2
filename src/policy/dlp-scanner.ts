import type { DLPFinding } from '../logging/types.js';
import type { DLPPattern } from './patterns.js';

export class DLPScanner {
  constructor(private patterns: DLPPattern[]) {}

  /**
   * Scan content for sensitive data patterns
   */
  scan(content: string, location: string): DLPFinding[] {
    const findings: DLPFinding[] = [];

    for (const pattern of this.patterns) {
      // Reset regex state
      pattern.regex.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(content)) !== null) {
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

  /**
   * Redact a matched string for logging (show first/last few chars)
   */
  private redactMatch(match: string): string {
    if (match.length <= 8) {
      return '***';
    }
    const visible = 3;
    return match.substring(0, visible) + '***' + match.substring(match.length - visible);
  }

  /**
   * Scan both input and output for sensitive data
   */
  scanToolCall(
    toolName: string,
    input: Record<string, unknown>,
    output?: string
  ): DLPFinding[] {
    const findings: DLPFinding[] = [];

    // Scan input parameters
    const inputStr = JSON.stringify(input);
    findings.push(...this.scan(inputStr, `${toolName}:input`));

    // Scan output
    if (output) {
      findings.push(...this.scan(output, `${toolName}:output`));
    }

    return findings;
  }
}
