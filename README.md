# PromptTrap

> **Open-source MCP server for AI governance and security visibility**

PromptTrap gives security teams visibility into how AI tools interact with corporate resources. It acts as an instrumented middleware layer between AI clients (like Claude Desktop) and your data, providing comprehensive audit logs, DLP scanning, and policy enforcement.

**Philosophy:** This is a "carrot, not stick" approach. Users load PromptTrap because it gives them useful tools to access corporate resources from their AI tools. The security telemetry is a side effect of providing that access.

## Features

- 🔍 **Full Audit Logging** — Every tool call is logged with structured JSON (stdout + SQLite)
- 🛡️ **DLP Scanning** — Automatic detection of credit cards, SSNs, API keys, private keys, and more
- 🚦 **Policy Engine** — File path restrictions, tool enable/disable, configurable actions
- 📊 **Built for Security Teams** — Query audit logs, track DLP findings, understand AI tool usage
- 🔌 **MCP Compatible** — Works with Claude Desktop, Cursor, VS Code, and other MCP clients
- ⚙️ **Single YAML Config** — No database migrations, no environment variable soup

## Quick Start

### Installation

```bash
npm install -g prompttrap
```

### Configuration

1. Create a config file:

```bash
cp prompttrap.example.yaml prompttrap.yaml
```

2. Edit `prompttrap.yaml` to customize settings (see [Configuration](#configuration))

### Claude Desktop Setup

Add PromptTrap to your `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "prompttrap": {
      "command": "npx",
      "args": ["-y", "prompttrap"],
      "env": {
        "PROMPTTRAP_CONFIG": "/path/to/prompttrap.yaml",
        "USER": "your.email@company.com"
      }
    }
  }
}
```

3. Restart Claude Desktop

4. You should see PromptTrap tools available in Claude (file_read, file_list, file_write)

## Configuration

PromptTrap is configured via a single YAML file. See [`prompttrap.example.yaml`](./prompttrap.example.yaml) for a complete example.

### Key Configuration Options

#### File Tools

```yaml
tools:
  file:
    enabled: true
    allowed_paths:
      - "/home"
      - "/tmp"
    denied_paths:
      - "/etc/shadow"
      - "**/.env"
      - "**/.ssh/**"
    max_file_size_mb: 10
```

- **allowed_paths**: If empty, all paths are allowed (except denied). If set, only these paths are accessible.
- **denied_paths**: Explicitly blocked paths (takes precedence). Supports glob patterns.

#### DLP Scanning

```yaml
dlp:
  enabled: true
  action: "log"  # log | warn | block
  patterns:
    credit_cards: true
    ssn: true
    api_keys: true
    emails: false
```

- **action**:
  - `log`: Record findings but allow operation
  - `warn`: Log and add warning to output
  - `block`: Prevent operation if sensitive data detected

#### Built-in DLP Patterns

PromptTrap detects these patterns out of the box:

- Credit card numbers (Luhn-validated)
- Social Security Numbers (with validity checks)
- AWS access keys and secret keys
- GitHub tokens (PATs, OAuth, etc.)
- Slack tokens
- Private keys (RSA, EC, OpenSSH)
- Database connection strings
- Generic API keys
- Email addresses (optional)

#### Custom DLP Patterns

Add your own patterns:

```yaml
dlp:
  patterns:
    custom:
      - name: "internal_project_code"
        pattern: "PROJ-[A-Z]{3}-\\d{4}"
        severity: "medium"
```

## Usage

Once configured, PromptTrap runs transparently. Every tool call is:

1. **Evaluated** against policy rules
2. **Scanned** for sensitive data
3. **Logged** to stdout (JSON) and SQLite
4. **Executed** (if allowed)

### Viewing Audit Logs

**Stdout (real-time)**:
```bash
# Logs are written to stdout as structured JSON
tail -f /path/to/claude/logs
```

**SQLite (queryable)**:
```bash
sqlite3 prompttrap.db "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;"
```

**Example log entry**:
```json
{
  "timestamp": "2026-02-11T15:00:00.000Z",
  "session_id": "abc-123",
  "user": "jane.doe@company.com",
  "tool_name": "file_read",
  "tool_input": {"path": "/home/user/secrets.txt"},
  "tool_output": "API_KEY=sk-1234...",
  "dlp_findings": [
    {
      "pattern": "generic_api_key",
      "severity": "medium",
      "location": "file_read:output",
      "redacted_sample": "API***234"
    }
  ],
  "policy_result": {
    "allowed": true,
    "action": "allow"
  },
  "latency_ms": 45
}
```

## Architecture

```
AI Client (Claude Desktop, Cursor, etc.)
    ↓
PromptTrap MCP Server
    ├── Policy Engine (path restrictions, tool enable/disable)
    ├── DLP Scanner (pattern matching on input/output)
    └── Logger (stdout JSON + SQLite)
    ↓
File System / Web / Database / Shell
```

## Security Considerations

- **Default to open, log everything**: Out of the box, PromptTrap logs but doesn't block. Users opt into enforcement.
- **Shell tools disabled by default**: `shell_exec` is high-risk and must be explicitly enabled.
- **Path restrictions**: Use `denied_paths` to protect sensitive directories (`.ssh`, `.env`, `/etc/shadow`, etc.)
- **DLP on input AND output**: Scans both tool arguments and responses for sensitive data.

## Development

```bash
# Clone the repo
git clone https://github.com/wardspan/prompttrap
cd prompttrap

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run locally
node dist/index.js
```

## Roadmap

### Phase 1 (Current)
- ✅ File tools (read, list, write)
- ✅ DLP scanner with built-in patterns
- ✅ Policy engine with path restrictions
- ✅ SQLite audit log
- ✅ Structured JSON logging

### Phase 2
- [ ] Web fetch tool
- [ ] Dashboard (web UI for viewing audit logs)
- [ ] Shell execution tool (disabled by default)
- [ ] Database query tool

### Phase 3
- [ ] SIEM integration (syslog, webhook output)
- [ ] Docker container
- [ ] npm package publishing
- [ ] Advanced policy rules (rate limiting, user roles)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

Apache 2.0 - See [LICENSE](./LICENSE) for details.

## Author

Ward Spangler / [AltGreen Research LLC](https://altgreen.com)

## Support

- **Issues**: [GitHub Issues](https://github.com/wardspan/prompttrap/issues)
- **Discussions**: [GitHub Discussions](https://github.com/wardspan/prompttrap/discussions)

---

**Do you know what your AI tools are doing with your data?**

PromptTrap gives you the answer.
