import type { DLPFinding } from '../logging/types.js';

export type DLPPattern = {
  name: string;
  regex: RegExp;
  severity: 'low' | 'medium' | 'high';
  validator?: (match: string) => boolean;
};

/**
 * Luhn algorithm for credit card validation
 */
function luhnCheck(cardNumber: string): boolean {
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
function ssnCheck(ssn: string): boolean {
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
 * Built-in DLP patterns for common sensitive data
 */
export const BUILTIN_PATTERNS: DLPPattern[] = [
  {
    name: 'credit_card',
    // Match 13-19 digit sequences with optional spaces/dashes
    regex: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{1,7}\b/g,
    severity: 'high',
    validator: luhnCheck,
  },
  {
    name: 'ssn',
    regex: /\b\d{3}[\s\-]?\d{2}[\s\-]?\d{4}\b/g,
    severity: 'high',
    validator: ssnCheck,
  },
  {
    name: 'aws_access_key',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: 'high',
  },
  {
    name: 'aws_secret_key',
    // 40-char base64 near AWS context
    regex: /(?:aws|AWS)[\s\S]{0,50}[A-Za-z0-9/+=]{40}\b/g,
    severity: 'high',
  },
  {
    name: 'github_token',
    regex: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g,
    severity: 'high',
  },
  {
    name: 'slack_token',
    regex: /\b(xoxb|xoxp|xoxs)-[A-Za-z0-9\-]+/g,
    severity: 'high',
  },
  {
    name: 'generic_api_key',
    // 32+ char alphanumeric near key/token keywords
    regex: /(?:key|token|secret|password)[\s:=]+[A-Za-z0-9]{32,}/gi,
    severity: 'medium',
  },
  {
    name: 'private_key',
    regex: /-----BEGIN\s+(RSA|EC|OPENSSH)?\s*PRIVATE KEY-----/g,
    severity: 'high',
  },
  {
    name: 'connection_string',
    // JDBC, MongoDB, PostgreSQL, MySQL with credentials
    regex: /(jdbc|mongodb(\+srv)?|postgres(ql)?|mysql):\/\/[^:]+:[^@]+@[^\s"']+/gi,
    severity: 'high',
  },
  {
    name: 'email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    severity: 'low',
  },
];

/**
 * Get enabled patterns based on config
 */
export function getEnabledPatterns(
  enabledFlags: Record<string, boolean>,
  customPatterns: Array<{ name: string; pattern: string; severity: 'low' | 'medium' | 'high' }>
): DLPPattern[] {
  const patterns: DLPPattern[] = [];

  // Add built-in patterns if enabled
  for (const pattern of BUILTIN_PATTERNS) {
    const configKey = pattern.name === 'email' ? 'emails' :
                      pattern.name.startsWith('credit') ? 'credit_cards' :
                      pattern.name === 'ssn' ? 'ssn' :
                      'api_keys'; // All key patterns fall under api_keys

    if (enabledFlags[configKey]) {
      patterns.push(pattern);
    }
  }

  // Add custom patterns
  for (const custom of customPatterns) {
    patterns.push({
      name: custom.name,
      regex: new RegExp(custom.pattern, 'g'),
      severity: custom.severity,
    });
  }

  return patterns;
}
