import { loadConfig } from '../src/config.js';
import { AuditStore } from '../src/logging/store.js';
import { Logger } from '../src/logging/logger.js';
import type { LogEntry } from '../src/logging/types.js';
import { randomUUID } from 'crypto';

// Generate test audit data
async function generateTestData() {
  const config = loadConfig();
  config.logging.sqlite.enabled = true;
  config.logging.stdout = false;

  const auditStore = new AuditStore(config);
  const logger = new Logger(config, auditStore);

  const sessionIds = [randomUUID(), randomUUID(), randomUUID()];
  const users = ['alice@company.com', 'bob@company.com', 'charlie@company.com'];
  const tools = ['file_read', 'file_list', 'file_write', 'web_fetch'];

  console.log('Generating test audit data...');

  for (let i = 0; i < 100; i++) {
    const sessionId = sessionIds[Math.floor(Math.random() * sessionIds.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const tool = tools[Math.floor(Math.random() * tools.length)];

    // Randomly add DLP findings
    const dlpFindings = [];
    if (Math.random() > 0.7) {
      const patterns = ['credit_card', 'ssn', 'api_key', 'email', 'aws_access_key'];
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      const severities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
      const severity = severities[Math.floor(Math.random() * severities.length)];

      dlpFindings.push({
        pattern,
        severity,
        location: `${tool}:output`,
        redacted_sample: '***',
      });
    }

    // Randomly add errors
    const hasError = Math.random() > 0.9;

    const entry: LogEntry = {
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      session_id: sessionId,
      user,
      tool_name: tool,
      tool_input: {
        path: '/home/user/test.txt',
        url: 'https://example.com',
      },
      tool_output: hasError ? undefined : 'Operation successful',
      dlp_findings: dlpFindings,
      policy_result: {
        allowed: true,
        action: dlpFindings.length > 0 ? 'warn' : 'allow',
      },
      latency_ms: Math.floor(Math.random() * 500) + 10,
      error: hasError ? 'Test error: File not found' : undefined,
    };

    logger.log(entry);
  }

  console.log('✓ Generated 100 test audit entries');
  console.log(`✓ Database: ${config.logging.sqlite.path}`);

  auditStore.close();
}

generateTestData().catch(console.error);
