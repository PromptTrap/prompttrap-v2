import { describe, it, expect } from 'vitest';
import { DLPScanner, BUILTIN_PATTERNS } from '@prompttrap/shared';

describe('Content DLP Scanner', () => {
  const scanner = new DLPScanner(BUILTIN_PATTERNS);

  describe('Credit Card Detection', () => {
    it('should detect valid credit card in paste', () => {
      const findings = scanner.scan('My card is 4532015112830366', 'paste');
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some(f => f.pattern === 'credit_card')).toBe(true);
    });

    it('should not detect invalid credit card', () => {
      const findings = scanner.scan('1234567890123456', 'paste');
      expect(findings.some(f => f.pattern === 'credit_card')).toBe(false);
    });
  });

  describe('AWS Key Detection', () => {
    it('should detect AWS access key', () => {
      const findings = scanner.scan('AKIAIOSFODNN7EXAMPLE', 'paste');
      expect(findings.some(f => f.pattern === 'aws_access_key')).toBe(true);
    });

    it('should detect AWS secret key', () => {
      const text = 'aws_secret_access_key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      const findings = scanner.scan(text, 'paste');
      expect(findings.some(f => f.pattern === 'aws_secret_key')).toBe(true);
    });
  });

  describe('GitHub Token Detection', () => {
    it('should detect GitHub PAT', () => {
      const findings = scanner.scan('ghp_abcdefghijklmnopqrstuvwxyz1234567890', 'paste');
      expect(findings.some(f => f.pattern === 'github_token')).toBe(true);
    });
  });

  describe('SSN Detection', () => {
    it('should detect valid SSN', () => {
      const findings = scanner.scan('SSN: 123-45-6789', 'paste');
      expect(findings.some(f => f.pattern === 'ssn')).toBe(true);
    });

    it('should reject invalid SSN (area 000)', () => {
      const findings = scanner.scan('000-45-6789', 'paste');
      expect(findings.some(f => f.pattern === 'ssn')).toBe(false);
    });
  });

  describe('Multiple Patterns', () => {
    it('should detect multiple patterns in same text', () => {
      const text = `
        AWS Key: AKIAIOSFODNN7EXAMPLE
        Credit Card: 4532015112830366
        GitHub Token: ghp_abcdefghijklmnopqrstuvwxyz1234567890
      `;
      const findings = scanner.scan(text, 'paste');
      expect(findings.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Redaction', () => {
    it('should redact matched values', () => {
      const findings = scanner.scan('4532015112830366', 'paste');
      const creditCardFinding = findings.find(f => f.pattern === 'credit_card');
      expect(creditCardFinding?.redacted_sample).toBe('453***366');
    });
  });
});
