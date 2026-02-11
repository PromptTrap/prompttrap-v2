# PromptTrap

> **Open-source MCP server for AI governance and security visibility**

PromptTrap gives security teams visibility into how AI tools interact with corporate resources. It acts as an instrumented middleware layer between AI clients (like Claude Desktop) and your data, providing comprehensive audit logs, DLP scanning, and policy enforcement.

**Philosophy:** This is a "carrot, not stick" approach. Users load PromptTrap because it gives them useful tools to access corporate resources from their AI tools. The security telemetry is a side effect of providing that access.

---

**📸 Dashboard Preview**

Real-time monitoring of AI tool usage with DLP detection:

<!-- TODO: Add screenshots after running npm run demo -->
<!-- ![Dashboard Overview](docs/images/dashboard-overview.png) -->

Features visible in the dashboard:
- 📊 Live activity feed with tool calls and DLP findings
- 🔍 Security pattern detection (API keys, SSNs, credit cards)
- 📈 Tool usage analytics and session tracking
- ⚡ Updates every 3 seconds

Run `npm run demo && npm run dashboard` to see it in action!

---

## Features

### MCP Server
- 🔍 **Full Audit Logging** — Every tool call is logged with structured JSON (stdout + SQLite)
- 🛡️ **DLP Scanning** — Automatic detection of credit cards, SSNs, API keys, private keys, and more
- 🚦 **Policy Engine** — File path restrictions, tool enable/disable, configurable actions
- 📊 **Built for Security Teams** — Query audit logs, track DLP findings, understand AI tool usage
- 🔌 **MCP Compatible** — Works with Claude Desktop, Cursor, VS Code, and other MCP clients
- ⚙️ **Single YAML Config** — No database migrations, no environment variable soup

### Browser Extension (NEW)
- 🌐 **Monitor Web-Based AI Tools** — Track usage of ChatGPT, Claude.ai, Gemini, Perplexity, and more
- 🎯 **DLP in the Browser** — Scan pasted content and submitted prompts for sensitive data
- 🔔 **Real-Time Warnings** — Alert users before they paste API keys or credit cards into AI chats
- 📊 **Unified Dashboard** — Browser events appear alongside MCP server events in the same audit log
- 🏢 **Enterprise-Ready** — Deploy via Chrome Enterprise, Microsoft Intune, or Group Policy
- 🔒 **Privacy-First** — Only metadata logged by default; full prompt logging optional

## Quick Start

### Installation

**Option 1: From source (currently required - npm package coming soon)**
```bash
git clone https://github.com/wardspan/prompttrap
cd prompttrap
npm install
npm run build
```

The `prompttrap` command will be available at:
- **macOS/Linux**: `./packages/mcp-server/dist/index.js`
- **Windows**: `.\packages\mcp-server\dist\index.js`

**Option 2: npm (coming soon)**
```bash
npm install -g prompttrap
```
*Note: Package publication to npm is in progress. For now, use Option 1.*

**Option 3: Docker**
```bash
docker pull wardspan/prompttrap
# or build locally
docker build -t prompttrap .
```

### Configuration

1. Create a config file:

```bash
cp prompttrap.example.yaml prompttrap.yaml
```

2. Edit `prompttrap.yaml` to customize settings (see [Configuration](#configuration))

### Claude Desktop Setup

Add PromptTrap to your `claude_desktop_config.json`:

**Config file location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**For local installation (recommended for now):**

```json
{
  "mcpServers": {
    "prompttrap": {
      "command": "node",
      "args": ["/absolute/path/to/prompttrap-v2/packages/mcp-server/dist/index.js"],
      "env": {
        "PROMPTTRAP_CONFIG": "/absolute/path/to/prompttrap.yaml",
        "USER": "your.email@company.com"
      }
    }
  }
}
```

**For npm installation (once published):**

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

**Setup steps:**

1. Copy the example config:
```bash
cp packages/mcp-server/prompttrap.example.yaml prompttrap.yaml
```

2. Edit `prompttrap.yaml` to customize settings

3. Update `claude_desktop_config.json` with the paths above (use absolute paths!)

4. Restart Claude Desktop

5. You should see PromptTrap tools available in Claude (file_read, file_list, file_write)

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

### Dashboard

PromptTrap includes a web dashboard for visualizing audit data:

```bash
npm run dashboard
```

Then open `http://127.0.0.1:9099` in your browser.

**Features:**
- 📊 Real-time activity feed (auto-refreshes every 3 seconds)
- 🔍 DLP findings summary with severity breakdown
- 📈 Tool usage chart showing which tools are called most
- ⏱️ Session timeline with user and activity tracking

### Viewing Audit Logs

**Dashboard (recommended)**:
```bash
npm run dashboard
# Open http://127.0.0.1:9099
```

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

## Browser Extension

PromptTrap includes a Chrome/Edge extension that monitors web-based AI tools and provides DLP protection in the browser.

### Supported AI Services

The extension automatically detects and monitors these services:
- ChatGPT (chatgpt.com)
- Claude.ai (claude.ai)
- Google Gemini (gemini.google.com)
- Perplexity (perplexity.ai)
- DeepSeek (deepseek.com)
- Microsoft Copilot (copilot.microsoft.com)
- Poe (poe.com)
- HuggingChat (huggingface.co/chat)
- You.com (you.com)
- Phind (phind.com)

### Installation

**Development Installation:**

1. Build the extension:
```bash
npm install
npm run build:extension
```

2. Load in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `packages/browser-extension/dist`

3. Install the native messaging host:
```bash
# macOS/Linux
cd packages/browser-extension/dist/native-host
chmod +x install-native-host.sh
./install-native-host.sh

# Windows
cd packages\browser-extension\dist\native-host
install-native-host.bat
```

**Enterprise Deployment:**

See [Enterprise Deployment Guide](./packages/browser-extension/docs/ENTERPRISE_DEPLOYMENT.md) for:
- Chrome Enterprise (force install via Google Admin Console)
- Microsoft Intune deployment with PowerShell
- Group Policy deployment for Active Directory

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (ChatGPT, Claude, Gemini, etc.)                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Content Script                                       │   │
│  │  • Detects AI service                                 │   │
│  │  • Monitors paste/input/submit events                 │   │
│  │  • Scans with DLP patterns                            │   │
│  │  • Shows toast warnings                               │   │
│  └──────────────┬──────────────────────────────────────┘   │
│                 │                                             │
│  ┌──────────────▼──────────────────────────────────────┐   │
│  │  Background Service Worker                            │   │
│  │  • Session tracking                                   │   │
│  │  • Badge updates                                      │   │
│  │  • Native messaging                                   │   │
│  └──────────────┬──────────────────────────────────────┘   │
└─────────────────┼──────────────────────────────────────────┘
                  │
                  │ Chrome Native Messaging Protocol
                  │
┌─────────────────▼──────────────────────────────────────────┐
│  Native Messaging Host (Node.js)                            │
│  • Reads stdin (4-byte length prefix + JSON)               │
│  • Writes to SQLite (same DB as MCP server)                │
│  • Responds to extension                                     │
└─────────────────────────────────────────────────────────────┘
```

### Configuration

Configure the extension via `chrome.storage.managed` (enterprise) or local storage:

```json
{
  "dlp": {
    "enabled": true,
    "action": "warn",
    "patterns": {
      "credit_cards": true,
      "ssn": true,
      "api_keys": true,
      "emails": false
    }
  },
  "logFullPrompts": false,
  "sessionTimeout": 1800000
}
```

**Privacy Settings:**
- `logFullPrompts: false` (default): Only logs metadata (service, timestamp, DLP findings)
- `logFullPrompts: true`: Logs full prompt text for compliance review

### Extension Popup

Click the PromptTrap icon to see:
- 📊 Session statistics (events, DLP findings, services used)
- 📝 Recent sessions with timestamps
- ⚙️ Extension status and toggle
- 🔗 Link to full dashboard

### Example Browser Event

```json
{
  "timestamp": "2026-02-11T15:30:00.000Z",
  "source": "browser_extension",
  "session_id": "browser-abc-123",
  "user": "jane.doe@company.com",
  "service": "ChatGPT",
  "event_type": "paste",
  "dlp_findings": [
    {
      "pattern": "aws_access_key",
      "severity": "high",
      "location": "paste",
      "redacted_sample": "AKIA***Q7ZF"
    }
  ],
  "action_taken": "warned",
  "full_text": null
}
```

## Architecture

### MCP Server Architecture

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

### Browser Extension Architecture

```
Web Browser → Content Script → Background Worker → Native Host → SQLite
                     ↓                                            ↑
              DLP Scanner (in-browser)                            │
                                                                  │
                                        Unified Dashboard ────────┘
```

## Security Considerations

- **Default to open, log everything**: Out of the box, PromptTrap logs but doesn't block. Users opt into enforcement.
- **Shell tools disabled by default**: `shell_exec` is high-risk and must be explicitly enabled.
- **Path restrictions**: Use `denied_paths` to protect sensitive directories (`.ssh`, `.env`, `/etc/shadow`, etc.)
- **DLP on input AND output**: Scans both tool arguments and responses for sensitive data.

## Demo

Run a realistic demo session with intentional DLP findings:

```bash
npm run demo
```

This simulates an AI session that:
- Reads normal files
- Attempts to read `.env` with AWS keys (⚠️ DLP detected)
- Reads customer data with SSNs (⚠️ DLP detected)
- Tries to access SSH keys (🚫 blocked by policy)
- Makes web requests
- Writes test data

Perfect for screenshots and demonstrations!

## Docker Deployment

**Run with Docker Compose:**

```bash
# Create config directory
mkdir -p config data
cp prompttrap.example.yaml config/prompttrap.yaml

# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Run standalone:**

```bash
docker run -d \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/data:/app/data \
  -e PROMPTTRAP_CONFIG=/app/config/prompttrap.yaml \
  -p 9099:9099 \
  prompttrap
```

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

# Run demo
npm run demo

# Start dashboard
npm run dashboard
```

### Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## Roadmap

### Phase 1 ✅ Complete
- ✅ File tools (read, list, write)
- ✅ DLP scanner with built-in patterns
- ✅ Policy engine with path restrictions
- ✅ SQLite audit log
- ✅ Structured JSON logging

### Phase 2 ✅ Complete
- ✅ Web fetch tool with domain restrictions
- ✅ Dashboard (web UI for viewing audit logs)
- ✅ Real-time activity monitoring
- ✅ DLP findings visualization

### Phase 3 ✅ Complete
- ✅ Browser extension (Chrome MV3)
- ✅ AI service detection (ChatGPT, Claude, Gemini, +7 more)
- ✅ DLP scanning in browser
- ✅ Native messaging to unified SQLite database
- ✅ Enterprise deployment (Chrome Enterprise, Intune, GPO)
- ✅ Privacy-first architecture (metadata only by default)
- ✅ Extension popup UI with session stats
- ✅ Demo script and comprehensive tests
- ✅ Docker deployment

### Phase 4 (Future)
- [ ] Shell execution tool (disabled by default)
- [ ] Database query tool
- [ ] SIEM integration (syslog, webhook output, OCSF format)
- [ ] npm package publishing
- [ ] Chrome Web Store submission
- [ ] Advanced policy rules (rate limiting, user roles)
- [ ] Browser extension for Firefox
- [ ] Prompt anonymization and tokenization

## FAQ

**Q: Does PromptTrap slow down AI tool responses?**  
A: Minimal impact. Typical overhead is 10-50ms per tool call. DLP scanning and logging happen asynchronously where possible.

**Q: Can I use this with tools other than Claude Desktop?**  
A: Yes! PromptTrap works with any MCP-compatible client (Cursor, VS Code with MCP extensions, etc.)

**Q: How do I export audit logs?**  
A: Logs are in SQLite (`prompttrap.db`). Export with:
```bash
sqlite3 prompttrap.db ".mode csv" ".output audit.csv" "SELECT * FROM audit_log;"
```

**Q: Can I add custom DLP patterns?**  
A: Yes! Add them to your `prompttrap.yaml`:
```yaml
dlp:
  patterns:
    custom:
      - name: "employee_id"
        pattern: "EMP-\\d{6}"
        severity: "medium"
```

**Q: Does this send my data anywhere?**  
A: No. PromptTrap runs entirely locally. All data stays on your machine. The only network calls are the ones you explicitly make via `web_fetch`.

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
