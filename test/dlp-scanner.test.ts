import { describe, it, expect } from 'vitest';
import { DLPScanner } from '../src/policy/dlp-scanner.js';
import { BUILTIN_PATTERNS } from '../src/policy/patterns.js';

describe('DLPScanner', () => {
  describe('Credit Card Detection', () => {
    const scanner = new DLPScanner([
      BUILTIN_PATTERNS.find(p => p.name === 'credit_card')!,
    ]);

    it('should detect valid credit card numbers', () => {
      // Visa test card
      const findings = scanner.scan('4532015112830366', 'test');
      expect(findings.length).toBe(1);
      expect(findings[0].pattern).toBe('credit_card');
      expect(findings[0].severity).toBe('high');
    });

    it('should detect credit cards with spaces', () => {
      const findings = scanner.scan('4532 0151 1283 0366', 'test');
      expect(findings.length).toBe(1);
    });

    it('should detect credit cards with dashes', () => {
      const findings = scanner.scan('4532-0151-1283-0366', 'test');
      expect(findings.length).toBe(1);
    });

    it('should reject invalid credit card numbers (Luhn check)', () => {
      const findings = scanner.scan('4532015112830367', 'test');
      expect(findings.length).toBe(0);
    });

    it('should not detect random numbers', () => {
      const findings = scanner.scan('1234567890123456', 'test');
      expect(findings.length).toBe(0);
    });
  });

  describe('SSN Detection', () => {
    const scanner = new DLPScanner([
      BUILTIN_PATTERNS.find(p => p.name === 'ssn')!,
    ]);

    it('should detect valid SSNs with dashes', () => {
      const findings = scanner.scan('123-45-6789', 'test');
      expect(findings.length).toBe(1);
      expect(findings[0].pattern).toBe('ssn');
    });

    it('should detect valid SSNs without dashes', () => {
      const findings = scanner.scan('123456789', 'test');
      expect(findings.length).toBe(1);
    });

    it('should reject SSNs with invalid area (000)', () => {
      const findings = scanner.scan('000-45-6789', 'test');
      expect(findings.length).toBe(0);
    });

    it('should reject SSNs with invalid area (666)', () => {
      const findings = scanner.scan('666-45-6789', 'test');
      expect(findings.length).toBe(0);
    });

    it('should reject SSNs with invalid area (900+)', () => {
      const findings = scanner.scan('900-45-6789', 'test');
      expect(findings.length).toBe(0);
    });

    it('should reject SSNs with zero group', () => {
      const findings = scanner.scan('123-00-6789', 'test');
      expect(findings.length).toBe(0);
    });

    it('should reject SSNs with zero serial', () => {
      const findings = scanner.scan('123-45-0000', 'test');
      expect(findings.length).toBe(0);
    });
  });

  describe('AWS Access Key Detection', () => {
    const scanner = new DLPScanner([
      BUILTIN_PATTERNS.find(p => p.name === 'aws_access_key')!,
    ]);

    it('should detect valid AWS access keys', () => {
      const findings = scanner.scan('AKIAIOSFODNN7EXAMPLE', 'test');
      expect(findings.length).toBe(1);
      expect(findings[0].pattern).toBe('aws_access_key');
      expect(findings[0].severity).toBe('high');
    });

    it('should not detect partial matches', () => {
      const findings = scanner.scan('AKIA123', 'test');
      expect(findings.length).toBe(0);
    });
  });

  describe('GitHub Token Detection', () => {
    const scanner = new DLPScanner([
      BUILTIN_PATTERNS.find(p => p.name === 'github_token')!,
    ]);

    it('should detect GitHub personal access tokens', () => {
      const findings = scanner.scan('ghp_abcdefghijklmnopqrstuvwxyz1234567890', 'test');
      expect(findings.length).toBe(1);
      expect(findings[0].pattern).toBe('github_token');
    });

    it('should detect GitHub OAuth tokens', () => {
      const findings = scanner.scan('gho_abcdefghijklmnopqrstuvwxyz1234567890', 'test');
      expect(findings.length).toBe(1);
    });

    it('should detect GitHub user-to-server tokens', () => {
      const findings = scanner.scan('ghu_abcdefghijklmnopqrstuvwxyz1234567890', 'test');
      expect(findings.length).toBe(1);
    });
  });

  describe('Private Key Detection', () => {
    const scanner = new DLPScanner([
      BUILTIN_PATTERNS.find(p => p.name === 'private_key')!,
    ]);

    it('should detect RSA private keys', () => {
      const findings = scanner.scan('-----BEGIN RSA PRIVATE KEY-----', 'test');
      expect(findings.length).toBe(1);
      expect(findings[0].pattern).toBe('private_key');
    });

    it('should detect EC private keys', () => {
      const findings = scanner.scan('-----BEGIN EC PRIVATE KEY-----', 'test');
      expect(findings.length).toBe(1);
    });

    it('should detect OpenSSH private keys', () => {
      const findings = scanner.scan('-----BEGIN OPENSSH PRIVATE KEY-----', 'test');
      expect(findings.length).toBe(1);
    });

    it('should detect generic private keys', () => {
      const findings = scanner.scan('-----BEGIN PRIVATE KEY-----', 'test');
      expect(findings.length).toBe(1);
    });
  });

  describe('Email Detection', () => {
    const scanner = new DLPScanner([
      BUILTIN_PATTERNS.find(p => p.name === 'email')!,
    ]);

    it('should detect email addresses', () => {
      const findings = scanner.scan('user@example.com', 'test');
      expect(findings.length).toBe(1);
      expect(findings[0].pattern).toBe('email');
      expect(findings[0].severity).toBe('low');
    });

    it('should detect emails with dots and dashes', () => {
      const findings = scanner.scan('first.last+tag@sub-domain.example.com', 'test');
      expect(findings.length).toBe(1);
    });
  });

  describe('Multiple Patterns', () => {
    const scanner = new DLPScanner(BUILTIN_PATTERNS);

    it('should detect multiple different patterns in same content', () => {
      const content = `
        Credit card: 4532015112830366
        SSN: 123-45-6789
        AWS Key: AKIAIOSFODNN7EXAMPLE
        Email: test@example.com
      `;
      const findings = scanner.scan(content, 'test');
      expect(findings.length).toBe(4);

      const patterns = findings.map(f => f.pattern);
      expect(patterns).toContain('credit_card');
      expect(patterns).toContain('ssn');
      expect(patterns).toContain('aws_access_key');
      expect(patterns).toContain('email');
    });
  });

  describe('Redaction', () => {
    const scanner = new DLPScanner([
      BUILTIN_PATTERNS.find(p => p.name === 'credit_card')!,
    ]);

    it('should redact matched strings in findings', () => {
      const findings = scanner.scan('4532015112830366', 'test');
      expect(findings[0].redacted_sample).toBe('453***366');
    });
  });
});
