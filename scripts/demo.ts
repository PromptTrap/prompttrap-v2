#!/usr/bin/env node
/**
 * Demo script that simulates a realistic AI session with intentional DLP findings
 * Run this to generate a compelling audit trail for demos and screenshots
 */

import { loadConfig } from '../src/config.js';
import { AuditStore } from '../src/logging/store.js';
import { Logger } from '../src/logging/logger.js';
import { PolicyEngine } from '../src/policy/engine.js';
import { DLPScanner } from '../src/policy/dlp-scanner.js';
import { getEnabledPatterns } from '../src/policy/patterns.js';
import type { LogEntry } from '../src/logging/types.js';
import { randomUUID } from 'crypto';

// Simulated tool outputs with intentional DLP findings
const scenarios = [
  {
    tool: 'file_read',
    path: '/home/user/project/README.md',
    output: 'PromptTrap - AI Governance Tool\n\nA security monitoring solution for AI tools.',
    description: 'Reading project documentation',
  },
  {
    tool: 'file_list',
    path: '/home/user/project',
    output: 'dir: src\ndir: test\nfile: README.md\nfile: package.json\nfile: .env',
    description: 'Listing project files',
  },
  {
    tool: 'file_read',
    path: '/home/user/project/.env',
    output: `# Environment variables
DATABASE_URL=postgresql://user:pass@localhost/db
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnopqrstuvwxyz`,
    description: '⚠️ Reading .env file with secrets',
  },
  {
    tool: 'web_fetch',
    url: 'https://api.github.com/repos/anthropics/claude',
    output: JSON.stringify({
      name: 'claude',
      description: 'Claude AI repository',
      stargazers_count: 1234,
    }, null, 2),
    description: 'Fetching GitHub API data',
  },
  {
    tool: 'file_read',
    path: '/home/user/documents/customers.csv',
    output: `name,email,phone,ssn
John Doe,john@example.com,555-0100,123-45-6789
Jane Smith,jane@example.com,555-0101,987-65-4321
Bob Wilson,bob@example.com,555-0102,456-78-9012`,
    description: '⚠️ Reading customer data with SSNs',
  },
  {
    tool: 'file_read',
    path: '/home/user/.ssh/id_rsa',
    output: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyz...
-----END RSA PRIVATE KEY-----`,
    description: '🚫 Attempting to read SSH private key (BLOCKED)',
    blocked: true,
  },
  {
    tool: 'file_write',
    path: '/home/user/test-data.txt',
    output: 'Successfully wrote 156 bytes to /home/user/test-data.txt',
    description: 'Writing test data',
  },
  {
    tool: 'web_fetch',
    url: 'https://example.com',
    output: `<!DOCTYPE html>
<html>
<head><title>Example Domain</title></head>
<body><h1>Example Domain</h1></body>
</html>`,
    description: 'Fetching example.com',
  },
  {
    tool: 'file_read',
    path: '/home/user/notes.txt',
    output: `Meeting Notes - 2026-02-11
- Discussed Q1 roadmap
- Contact: alice@company.com
- Budget approved
- Credit card for expenses: 4532-0151-1283-0366`,
    description: '⚠️ Reading notes with credit card number',
  },
  {
    tool: 'file_list',
    path: '/var/log',
    output: 'Permission denied',
    description: '🚫 Attempting to list system logs (BLOCKED)',
    blocked: true,
    error: 'Path matches denied pattern: /var/log',
  },
];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('🎬 Starting PromptTrap Demo Session\n');
  console.log('This simulates a realistic AI session with intentional DLP findings.');
  console.log('Watch the dashboard at http://127.0.0.1:9099 for real-time updates!\n');

  const config = loadConfig();
  config.logging.stdout = true;
  config.logging.sqlite.enabled = true;

  // Initialize components
  const auditStore = new AuditStore(config);
  const logger = new Logger(config, auditStore);
  const policyEngine = new PolicyEngine(config);
  const enabledPatterns = getEnabledPatterns(config.dlp.patterns, config.dlp.patterns.custom);
  const dlpScanner = new DLPScanner(enabledPatterns);

  const sessionId = randomUUID();
  const user = 'demo-user@company.com';

  console.log(`Session ID: ${sessionId}`);
  console.log(`User: ${user}`);
  console.log(`DLP Action: ${config.dlp.action}\n`);
  console.log('─'.repeat(80));

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const startTime = Date.now();

    console.log(`\n[${i + 1}/${scenarios.length}] ${scenario.description}`);
    console.log(`Tool: ${scenario.tool}`);

    // Evaluate policy
    const args: Record<string, unknown> = {};
    if ('path' in scenario) args.path = scenario.path;
    if ('url' in scenario) args.url = scenario.url;

    let policyResult = policyEngine.evaluateToolCall(scenario.tool, args);
    let dlpFindings = scenario.blocked ? [] : dlpScanner.scanToolCall(
      scenario.tool,
      args,
      scenario.output
    );

    // Check for DLP violations
    if (dlpFindings.length > 0 && config.dlp.action === 'block') {
      policyResult = {
        allowed: false,
        action: 'block',
        reason: `DLP violation: ${dlpFindings.length} sensitive pattern(s) detected`,
      };
    }

    const latencyMs = Date.now() - startTime + Math.floor(Math.random() * 100);

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      user,
      tool_name: scenario.tool,
      tool_input: args,
      tool_output: policyResult.allowed ? logger.sanitizeOutput(scenario.output) : undefined,
      dlp_findings: dlpFindings,
      policy_result: policyResult,
      latency_ms: latencyMs,
      error: scenario.error,
    };

    // Log it
    logger.log(logEntry);

    // Display results
    if (scenario.blocked || !policyResult.allowed) {
      console.log(`❌ BLOCKED: ${policyResult.reason}`);
    } else if (dlpFindings.length > 0) {
      console.log(`⚠️  ALLOWED with DLP findings:`);
      dlpFindings.forEach(finding => {
        console.log(`   - ${finding.pattern} (${finding.severity}) at ${finding.location}`);
      });
    } else {
      console.log(`✓ ALLOWED (${latencyMs}ms)`);
    }

    // Pause between operations for dramatic effect
    await sleep(800);
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n✅ Demo session complete!\n');

  // Summary
  const allEntries = auditStore.getRecent(scenarios.length);
  const dlpSummary = auditStore.getDLPSummary();

  console.log('📊 Summary:');
  console.log(`   Total operations: ${allEntries.length}`);
  console.log(`   Blocked: ${allEntries.filter(e => !e.policy_result.allowed).length}`);
  console.log(`   DLP findings: ${allEntries.reduce((sum, e) => sum + e.dlp_findings.length, 0)}`);

  if (dlpSummary.length > 0) {
    console.log('\n🔍 DLP Patterns Detected:');
    dlpSummary.forEach(item => {
      console.log(`   - ${item.pattern}: ${item.count} (${item.severity})`);
    });
  }

  console.log('\n🎯 Next steps:');
  console.log('   1. Open dashboard: http://127.0.0.1:9099');
  console.log('   2. View SQLite: sqlite3 prompttrap.db "SELECT * FROM audit_log;"');
  console.log('   3. Take a screenshot for LinkedIn! 📸\n');

  auditStore.close();
}

runDemo().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
