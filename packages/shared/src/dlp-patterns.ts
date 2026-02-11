/**
 * Shared DLP patterns used by both MCP server and browser extension
 */

export type DLPSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DLPPattern {
  name: string;
  regex: RegExp;
  severity: DLPSeverity;
  validator?: (match: string) => boolean;
  description: string;
}

export interface DLPFinding {
  pattern: string;
  severity: DLPSeverity;
  location: string;
  redacted_sample?: string;
}

/**
 * Luhn algorithm for credit card validation
 */
export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * SSN validation (no 000, 666, or 9xx group)
 */
export function ssnCheck(ssn: string): boolean {
  const digits = ssn.replace(/\D/g, '');
  if (digits.length !== 9) return false;

  const area = parseInt(digits.substring(0, 3), 10);
  const group = parseInt(digits.substring(3, 5), 10);
  const serial = parseInt(digits.substring(5, 9), 10);

  // Invalid area numbers
  if (area === 0 || area === 666 || area >= 900) return false;
  // Invalid group or serial
  if (group === 0 || serial === 0) return false;

  return true;
}

/**
 * Built-in DLP patterns
 */
export const BUILTIN_PATTERNS: DLPPattern[] = [
  {
    name: 'credit_card',
    regex: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{1,7}\b/g,
    severity: 'high',
    validator: luhnCheck,
    description: 'Credit card number (Luhn-validated)',
  },
  {
    name: 'ssn',
    regex: /\b\d{3}[\s\-]?\d{2}[\s\-]?\d{4}\b/g,
    severity: 'high',
    validator: ssnCheck,
    description: 'Social Security Number',
  },
  {
    name: 'aws_access_key',
    regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
    severity: 'critical',
    description: 'AWS Access Key ID',
  },
  {
    name: 'aws_secret_key',
    regex: /(?:aws|AWS)[\s\S]{0,50}[A-Za-z0-9/+=]{40}\b/g,
    severity: 'critical',
    description: 'AWS Secret Access Key',
  },
  {
    name: 'github_token',
    regex: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g,
    severity: 'critical',
    description: 'GitHub Token',
  },
  {
    name: 'slack_token',
    regex: /\b(xoxb|xoxp|xoxs|xoxa|xoxr)-[A-Za-z0-9\-]+/g,
    severity: 'critical',
    description: 'Slack Token',
  },
  {
    name: 'google_api_key',
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
    severity: 'critical',
    description: 'Google API Key',
  },
  {
    name: 'generic_api_key',
    regex: /(?:key|token|secret|password|pwd|pass)[\s:=]+[A-Za-z0-9]{32,}/gi,
    severity: 'medium',
    description: 'Generic API key or secret',
  },
  {
    name: 'private_key',
    regex: /-----BEGIN\s+(RSA|EC|OPENSSH)?\s*PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'Private key (RSA, EC, OpenSSH)',
  },
  {
    name: 'connection_string',
    regex: /(jdbc|mongodb(\+srv)?|postgres(ql)?|mysql):\/\/[^:]+:[^@]+@[^\s"']+/gi,
    severity: 'high',
    description: 'Database connection string with credentials',
  },
  {
    name: 'azure_key',
    regex: /[A-Za-z0-9+/]{44}==?/g,
    severity: 'high',
    description: 'Azure storage key or similar base64-encoded secret',
  },
  {
    name: 'email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    severity: 'low',
    description: 'Email address',
  },
];

/**
 * DLP Scanner class for text analysis
 */
export class DLPScanner {
  constructor(private patterns: DLPPattern[]) {}

  scan(content: string, location: string): DLPFinding[] {
    const findings: DLPFinding[] = [];

    for (const pattern of this.patterns) {
      pattern.regex.lastIndex = 0; // Reset regex state

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

  private redactMatch(match: string): string {
    if (match.length <= 8) {
      return '***';
    }
    const visible = 3;
    return match.substring(0, visible) + '***' + match.substring(match.length - visible);
  }
}
