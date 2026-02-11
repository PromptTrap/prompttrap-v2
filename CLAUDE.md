# CLAUDE.md — PromptTrap

## Project Overview

PromptTrap is an open-source AI governance toolkit that gives security teams visibility into how AI tools are being used across an organization. It has two components:

1. **PromptTrap MCP Server** — An instrumented MCP (Model Context Protocol) server that provides sanctioned AI tool access (file operations, web fetch, database queries, shell commands) while logging every interaction, scanning for sensitive data leakage, and enforcing security policies. Works with Claude Desktop, Cursor, VS Code/Copilot, ChatGPT, Windsurf, Perplexity, Gemini CLI, and any MCP-compatible client.

2. **PromptTrap Browser Extension** — A lightweight Chrome/Edge/Firefox extension that monitors browser-based AI usage (chatgpt.com, claude.ai, gemini.google.com, perplexity.ai, etc.), scans text inputs for sensitive data patterns, logs which AI services are accessed, and feeds into the same dashboard as the MCP server. This catches the 90%+ of enterprise AI usage that happens in browser tabs and is invisible to MCP.

**Together, these two components provide complete visibility:** MCP covers sanctioned tool-augmented AI workflows; the browser extension covers unsanctioned browser-based AI usage. One dashboard, both layers.

**Philosophy:** This is "carrot + visibility" — not surveillance. The MCP server gives users sanctioned access to corporate resources from their AI tools (the carrot). The browser extension provides organizational visibility with a privacy-respecting design (metadata and DLP pattern matches, not full prompt logging by default). Default posture is open: log everything, block nothing. Organizations opt into enforcement.

**Why open source:** Funded startups (LayerX, Privengy, Nightfall, etc.) charge six figures for browser DLP that amounts to regex patterns and domain blocklists in a dashboard. The core technical problem isn't hard. PromptTrap gives it away for free, letting every security team get visibility without a procurement cycle. If the open-source version is good enough, it forces the market to compete on real value.

**Target users:** CISOs, security teams, and IT administrators who need visibility into enterprise AI usage. Secondary users are developers and knowledge workers who want sanctioned AI access to internal resources.

**License:** Apache 2.0

**Author:** Ward Spangler / AltGreen Research LLC
**Repository:** github.com/wardspan/prompttrap

---

## Client Compatibility

### MCP Server — Supported Clients

| Client | Transport | Setup |
|---|---|---|
| Claude Desktop | stdio | claude_desktop_config.json |
| Claude Code | stdio | `claude mcp add` |
| Cursor | stdio | Settings → Features → MCP |
| VS Code + GitHub Copilot | stdio + remote HTTP | MCP config in settings |
| Windsurf | stdio + remote (PAT) | MCP config |
| ChatGPT (Business/Enterprise) | **remote HTTP/SSE only** | Settings → Connectors → Developer Mode |
| Perplexity (Mac) | stdio | Settings → Connectors |
| Gemini CLI | stdio + remote HTTP | ~/.gemini/settings.json or gemini.json |
| JetBrains IDEs | stdio + remote | Via Copilot integration |
| Cline (VS Code) | stdio | MCP config |
| Continue (VS Code/JetBrains) | stdio | MCP config |

### Browser Extension — Monitored AI Services

The extension monitors interactions with (at minimum):
- chatgpt.com / chat.openai.com
- claude.ai
- gemini.google.com
- perplexity.ai
- deepseek.com
- copilot.microsoft.com
- poe.com
- huggingface.co/chat
- you.com
- phind.com
- Custom domains (configurable)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PromptTrap Dashboard                      │
│           (Local web UI reading from SQLite)                 │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Activity Feed │  │ DLP Findings │  │ AI Service Usage  │  │
│  │ (all events)  │  │ (by severity)│  │ (browser + MCP)   │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│  ┌──────────────┐  ┌──────────────────────────────────────┐  │
│  │ Tool Usage   │  │ Session Timeline                     │  │
│  │ Breakdown    │  │ (who did what when)                  │  │
│  └──────────────┘  └──────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ reads from
                           ▼
                    ┌──────────────┐
                    │   SQLite DB  │
                    │ (audit log)  │
                    └──────┬───────┘
                           │ writes to
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────┐  ┌──────────────────────────┐
│  MCP Server          │  │  Browser Extension       │
│  (stdio + HTTP)      │  │  (Chrome/Edge/Firefox)   │
│                      │  │                          │
│  Logs:               │  │  Logs:                   │
│  - Tool invocations  │  │  - AI service visits     │
│  - Input/output data │  │  - Input field DLP scans │
│  - DLP scan results  │  │  - Copy/paste DLP scans  │
│  - Policy decisions  │  │  - File upload detection  │
│  - Session context   │  │  - Time-on-site metrics  │
│                      │  │  - Domain classification │
│  Enforces:           │  │                          │
│  - Path restrictions │  │  Enforces:               │
│  - DLP block/warn    │  │  - DLP warn/block on     │
│  - Rate limiting     │  │    paste/upload           │
│  - Tool allow/deny   │  │  - Domain allow/block    │
│                      │  │  - Warn banners          │
└──────────────────────┘  └──────────────────────────┘
        │                           │
        ▼                           ▼
  AI Clients:                 Browser AI:
  Claude Desktop              chatgpt.com
  Cursor                      claude.ai
  VS Code/Copilot             gemini.google.com
  ChatGPT (via HTTP)          perplexity.ai
  Windsurf                    deepseek.com
  Gemini CLI                  copilot.microsoft.com
  Perplexity                  etc.
```

---

## Tech Stack

### MCP Server
- **Language:** TypeScript
- **MCP SDK:** `@modelcontextprotocol/sdk` (latest)
- **Transport:** stdio (Phase 1) + Streamable HTTP/SSE (Phase 2)
- **Schema validation:** Zod
- **Config:** YAML config file (`prompttrap.yaml`)
- **Storage:** SQLite via `better-sqlite3` for local audit log
- **Build:** tsup or tsc
- **Testing:** vitest

### Browser Extension
- **Manifest:** V3 (Chrome/Edge), with Firefox compatibility
- **Language:** TypeScript
- **Build:** Vite or webpack
- **Permissions:** Minimal — content scripts on AI domains only, no broad host permissions
- **Communication:** Writes to same SQLite DB via native messaging host, OR sends to a local PromptTrap HTTP endpoint
- **Size target:** < 500KB, no frameworks, vanilla JS for content scripts

### Dashboard
- **Server:** Express (lightweight, local only)
- **Frontend:** Single HTML page, vanilla JS, no frameworks
- **Data:** Reads from SQLite, polls for updates
- **Port:** 9099 (default, configurable)

---

## Project Structure

```
prompttrap/
├── CLAUDE.md                    # This file
├── README.md                    # GitHub readme
├── LICENSE                      # Apache 2.0
├── package.json                 # Monorepo root (npm workspaces)
├── tsconfig.base.json           # Shared TypeScript config
│
├── packages/
│   ├── mcp-server/              # MCP Server package
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts             # Entry point — starts MCP server
│   │   │   ├── server.ts            # MCP server setup and tool registration
│   │   │   ├── config.ts            # YAML config loader and validation
│   │   │   ├── tools/               # Tool implementations
│   │   │   │   ├── index.ts         # Tool registry
│   │   │   │   ├── file-tools.ts    # file_read, file_write, file_list
│   │   │   │   ├── web-tools.ts     # web_fetch
│   │   │   │   ├── shell-tools.ts   # shell_exec (disabled by default)
│   │   │   │   └── db-tools.ts      # db_query (disabled by default)
│   │   │   ├── policy/              # Policy engine
│   │   │   │   ├── engine.ts        # Core policy evaluation logic
│   │   │   │   ├── dlp-scanner.ts   # DLP pattern matching
│   │   │   │   └── patterns.ts      # Built-in DLP patterns
│   │   │   ├── logging/             # Logging and telemetry
│   │   │   │   ├── logger.ts        # Structured JSON logger
│   │   │   │   ├── store.ts         # SQLite audit log store
│   │   │   │   └── types.ts         # Log entry types
│   │   │   └── transport/           # Transport handlers
│   │   │       ├── stdio.ts         # stdio transport (Phase 1)
│   │   │       └── http.ts          # HTTP/SSE transport (Phase 2)
│   │   └── test/
│   │       ├── dlp-scanner.test.ts
│   │       ├── policy-engine.test.ts
│   │       └── tools.test.ts
│   │
│   ├── browser-extension/       # Browser Extension package (Phase 3)
│   │   ├── package.json
│   │   ├── manifest.json            # Chrome MV3 manifest
│   │   ├── src/
│   │   │   ├── background.ts        # Service worker
│   │   │   ├── content/             # Content scripts (per-AI-site)
│   │   │   │   ├── detector.ts      # Detect AI service and monitor inputs
│   │   │   │   ├── dlp-scan.ts      # Scan text fields for sensitive data
│   │   │   │   └── reporter.ts      # Send events to background worker
│   │   │   ├── popup/               # Extension popup UI
│   │   │   │   ├── popup.html
│   │   │   │   └── popup.ts
│   │   │   ├── native-host/         # Native messaging host (bridge to SQLite)
│   │   │   │   ├── host.ts          # Node process that writes to SQLite
│   │   │   │   └── manifest.json    # Native messaging manifest
│   │   │   └── shared/
│   │   │       ├── ai-domains.ts    # AI service domain registry
│   │   │       ├── dlp-patterns.ts  # Shared DLP patterns (from core)
│   │   │       └── types.ts         # Event types
│   │   └── test/
│   │       ├── detector.test.ts
│   │       └── dlp-scan.test.ts
│   │
│   ├── dashboard/               # Web Dashboard package (Phase 2)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── server.ts            # Express server
│   │   │   └── public/
│   │   │       └── index.html       # Single-page dashboard
│   │   └── test/
│   │
│   └── shared/                  # Shared utilities
│       ├── package.json
│       ├── src/
│       │   ├── dlp-patterns.ts      # DLP patterns (used by MCP + extension)
│       │   ├── db-schema.ts         # SQLite schema definition
│       │   ├── event-types.ts       # Shared event/log types
│       │   └── config-types.ts      # Shared config types
│       └── test/
│
├── prompttrap.example.yaml      # Example configuration
├── scripts/
│   └── demo.ts                  # Replay synthetic session for demos
└── docker/
    └── Dockerfile               # Container option
```

---

## Configuration File (`prompttrap.yaml`)

```yaml
# PromptTrap Configuration
server:
  name: "prompttrap"
  version: "0.1.0"

identity:
  method: "env"         # env | static
  env_var: "USER"
  # static_user: "jane.doe@company.com"

transport:
  stdio: true           # Phase 1: local MCP clients
  http:
    enabled: false       # Phase 2: ChatGPT, remote clients
    port: 9098
    # auth:
    #   type: "bearer"
    #   token: "${PROMPTTRAP_AUTH_TOKEN}"

tools:
  file:
    enabled: true
    allowed_paths:
      - "/home"
      - "/tmp"
    denied_paths:
      - "/etc/shadow"
      - "/etc/passwd"
      - "**/.env"
      - "**/.ssh"
    max_file_size_mb: 10

  web:
    enabled: true
    allowed_domains: []
    denied_domains:
      - "*.internal.company.com"

  shell:
    enabled: false
    allowed_commands: []
    denied_commands:
      - "rm -rf"
      - "curl"

  database:
    enabled: false
    connection_string: ""
    read_only: true

dlp:
  enabled: true
  action: "log"          # log | warn | block
  patterns:
    credit_cards: true
    ssn: true
    api_keys: true
    private_keys: true
    connection_strings: true
    emails: false
    custom: []
    # - name: "internal_project_code"
    #   pattern: "PROJ-[A-Z]{3}-\\d{4}"
    #   severity: "medium"

# Browser extension settings (Phase 3)
browser:
  enabled: false
  monitored_domains:
    - "chatgpt.com"
    - "chat.openai.com"
    - "claude.ai"
    - "gemini.google.com"
    - "perplexity.ai"
    - "deepseek.com"
    - "copilot.microsoft.com"
    - "poe.com"
    - "huggingface.co"
    - "you.com"
    - "phind.com"
  blocked_domains: []     # Domains to block entirely
  dlp_on_paste: true      # Scan clipboard paste into AI tools
  dlp_on_upload: true     # Scan file uploads to AI tools
  warn_banner: true       # Show "this is being monitored" banner
  log_prompts: false      # DEFAULT OFF — privacy-first. Only log metadata.

logging:
  stdout: true
  sqlite:
    enabled: true
    path: "./prompttrap.db"
  # Future: webhook, syslog, OCSF

dashboard:
  enabled: true
  port: 9099
  bind: "127.0.0.1"
```

---

## SQLite Schema (shared by MCP server + browser extension)

```sql
-- Core events table — every event from both sources
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL,           -- 'mcp' | 'browser'
  event_type TEXT NOT NULL,       -- 'tool_call' | 'ai_visit' | 'paste' | 'upload' | 'dlp_finding'
  user_id TEXT,
  session_id TEXT,

  -- MCP-specific fields
  tool_name TEXT,                 -- e.g., 'file_read', 'web_fetch'
  tool_input TEXT,                -- JSON of tool parameters (truncated if large)
  tool_output_hash TEXT,          -- SHA256 of output (not storing full output by default)
  policy_result TEXT,             -- 'allowed' | 'warned' | 'blocked'
  latency_ms INTEGER,

  -- Browser-specific fields
  domain TEXT,                    -- e.g., 'chatgpt.com'
  ai_service TEXT,                -- e.g., 'ChatGPT', 'Claude', 'Gemini'
  action TEXT,                    -- 'page_visit' | 'text_input' | 'paste' | 'file_upload'
  input_length INTEGER,           -- character count (not content — privacy)
  duration_seconds INTEGER,       -- time spent on AI service

  -- DLP fields (shared)
  dlp_findings TEXT,              -- JSON array of findings
  dlp_severity TEXT,              -- 'none' | 'low' | 'medium' | 'high' | 'critical'
  dlp_action_taken TEXT           -- 'logged' | 'warned' | 'blocked'
);

CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_source ON events(source);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_severity ON events(dlp_severity);
CREATE INDEX idx_events_domain ON events(domain);
```

---

## DLP Patterns (Built-in, shared by MCP + extension)

These are in `packages/shared/src/dlp-patterns.ts` and used by both components:

- **Credit Cards:** Luhn-validated 13-19 digit sequences (Visa, MC, Amex, Discover)
- **SSN:** `\d{3}-\d{2}-\d{4}` with validity checks (no 000, 666, 9xx group)
- **AWS Access Keys:** `AKIA[0-9A-Z]{16}`
- **AWS Secret Keys:** 40-char base64 strings near AWS context
- **GitHub Tokens:** `ghp_[A-Za-z0-9]{36}`, `gho_`, `ghu_`, `ghs_`, `ghr_`
- **Slack Tokens:** `xoxb-`, `xoxp-`, `xoxs-`
- **Google API Keys:** `AIza[0-9A-Za-z-_]{35}`
- **Generic API Keys:** `[A-Za-z0-9]{32,}` near keywords "key", "token", "secret", "password"
- **Private Keys:** `-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----`
- **Connection Strings:** JDBC, MongoDB, PostgreSQL, MySQL URIs with credentials
- **Azure Keys:** 44-char base64 strings matching Azure patterns

---

## Implementation Phases

### Phase 1: MCP Server Core (stdio) — SHIP FIRST
1. Monorepo scaffolding (npm workspaces, shared package)
2. Shared DLP patterns + SQLite schema + event types
3. YAML config loader with Zod validation
4. MCP server with stdio transport
5. `file_read` and `file_list` tools with path restriction enforcement
6. DLP scanner (credit cards, SSNs, API key patterns)
7. Policy engine wiring — every tool call evaluated and logged
8. Structured JSON logger (stdout) + SQLite audit store
9. Tests for DLP scanner and policy engine
10. README with installation + Claude Desktop/Cursor setup instructions
11. `file_write` and `web_fetch` tools

### Phase 2: Dashboard + HTTP Transport
1. Express-based web dashboard reading from SQLite
   - Real-time activity feed (polling)
   - DLP findings summary with severity breakdown
   - Tool usage chart
   - Session timeline view
2. HTTP/SSE transport for ChatGPT and remote client support
3. Bearer token auth for HTTP transport
4. `shell_exec` tool (disabled by default, with warnings)
5. Demo replay script (synthetic session with intentional DLP findings)

### Phase 3: Browser Extension
1. Chrome MV3 extension skeleton
2. AI domain detection (content script injection on monitored domains)
3. Input field monitoring — detect text entry and paste into AI chat fields
4. DLP scanning on paste/upload — reuse shared patterns from MCP server
5. Native messaging host to bridge extension → SQLite database
6. Extension popup showing current session summary
7. Dashboard integration — browser events appear alongside MCP events
8. Optional warn/block on DLP findings (toast notification before send)
9. Firefox port (manifest differences)
10. MDM/GPO deployment instructions (Chrome Enterprise, Intune)

### Phase 4: Polish + Release
1. npm package publishing (`npx prompttrap`)
2. Docker container option
3. GitHub Actions CI
4. Chrome Web Store submission
5. Example SIEM integration (webhook/syslog output)
6. AGENTS.md for AI coding tools
7. Demo video / screenshot gallery for README

---

## Browser Extension — Design Decisions

1. **Privacy-first by default.** `log_prompts: false` is the default. Out of the box, the extension logs metadata only: which AI service, when, how much text (character count), DLP pattern matches. It does NOT capture or store prompt content unless the admin explicitly enables it. This is critical for adoption and trust.

2. **DLP scanning happens locally.** All pattern matching runs in the content script — sensitive data never leaves the browser. Only the DLP finding metadata (pattern name, severity, field location) is sent to the background worker and logged.

3. **Minimal permissions.** The extension only injects content scripts on known AI domains. No `<all_urls>`, no broad host permissions, no access to browsing history. This makes Chrome Web Store review easier and reduces user anxiety.

4. **Warn, don't block (by default).** When DLP finds sensitive data in a paste, the default behavior is a non-intrusive toast: "⚠️ PromptTrap detected what appears to be an API key in your input." The user can dismiss and proceed. Blocking requires explicit admin opt-in.

5. **The banner builds trust.** When `warn_banner: true`, the extension shows a subtle top-of-page banner on AI sites: "PromptTrap: AI usage on this site is being logged per company policy." Transparency reduces perception of surveillance.

6. **Native messaging host bridges to SQLite.** The extension communicates with a lightweight Node.js process (the native messaging host) that writes events to the same SQLite database the MCP server uses. This means one dashboard shows everything.

7. **No framework bloat.** Content scripts are vanilla TypeScript compiled to plain JS. The popup is minimal HTML/JS. Total extension size target: < 500KB.

---

## Key Design Decisions (Overall)

1. **Every tool call goes through the policy engine.** Even if no policies are configured, every invocation is logged. Non-negotiable.

2. **DLP scanning runs on both inputs AND outputs.** Tool responses (reading a file) might contain sensitive data the user didn't explicitly send.

3. **Default to open, log everything, block nothing.** Maximizes first-run adoption. Users opt into enforcement.

4. **Single YAML config file.** No database migrations, no env var soup. One file to understand the whole policy.

5. **Dashboard is optional and runs separately.** MCP server is headless (stdio). Dashboard reads from SQLite. They don't need to run together.

6. **MCP tool annotations are set correctly.** `readOnlyHint: true` for read tools, `destructiveHint: true` for destructive tools.

7. **Shared DLP patterns and schema.** Both MCP server and browser extension use the same patterns from `packages/shared`. One fix improves both.

8. **Monorepo with npm workspaces.** All packages live together, share types and utilities, but are independently publishable.

---

## MCP Client Configuration Examples

### Claude Desktop (stdio)
```json
{
  "mcpServers": {
    "prompttrap": {
      "command": "npx",
      "args": ["-y", "prompttrap"],
      "env": {
        "PROMPTTRAP_CONFIG": "/path/to/prompttrap.yaml",
        "USER": "jane.doe@company.com"
      }
    }
  }
}
```

### Cursor
Settings → Features → MCP → Add MCP Server
- Command: `npx -y prompttrap`
- Env: `PROMPTTRAP_CONFIG=/path/to/prompttrap.yaml`

### ChatGPT (remote HTTP, Phase 2)
Settings → Connectors → Developer Mode → Add Connector
- URL: `https://prompttrap.yourcompany.com/mcp` (or ngrok tunnel for testing)
- Auth: Bearer token

### VS Code + Copilot
```json
{
  "servers": {
    "prompttrap": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "prompttrap"],
      "env": {
        "PROMPTTRAP_CONFIG": "/path/to/prompttrap.yaml"
      }
    }
  }
}
```

---

## Testing Strategy

- **DLP Scanner:** Each pattern tested against known-good matches AND known false positives. Edge cases: formatted vs unformatted CC numbers, SSNs with/without dashes, API keys in various contexts.
- **Policy Engine:** Allow/deny path rules, rate limiting, tool enable/disable.
- **Tools:** File operations respect path restrictions, denied operations fail gracefully.
- **Integration:** End-to-end: invoke tool → verify log entry in SQLite with correct fields.
- **Browser Extension:** Mock DOM injection tests for AI domain detection, DLP scanning on synthetic text fields.

---

## What Success Looks Like

### The Screenshot Moment (MCP)
A security person installs PromptTrap, adds it to Claude Desktop, uses Claude normally for 30 minutes, opens the dashboard, and sees exactly what tools were called, what data flowed through, and whether any sensitive data was detected. They share a screenshot on LinkedIn.

### The Screenshot Moment (Browser Extension)
A CISO installs the browser extension on their own machine, uses ChatGPT and Claude.ai for an hour, opens the dashboard, and sees: "You visited 3 AI services, pasted 47 text inputs, and PromptTrap detected 2 AWS access keys and 1 SSN in content you sent to ChatGPT." That's the screenshot that kills a six-figure vendor deal.

### The Conversation Starter
PromptTrap doesn't need to be a product. It needs to start a conversation. Every CISO roundtable, every PeakSpan portfolio board meeting, every security conference: "Install this free tool, use your AI for a day, look at the logs. Now tell me you don't need AI governance."
