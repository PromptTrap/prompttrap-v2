# CLAUDE.md — PromptTrap MCP Server

## Project Overview

PromptTrap is an open-source MCP (Model Context Protocol) server that gives security teams visibility into how AI tools interact with corporate resources. It acts as an instrumented middleware layer — users get useful tools (file access, database queries, web fetch, code execution), and security teams get full audit logs, DLP scanning, and policy enforcement.

**Philosophy:** This is a "carrot, not stick" approach to AI governance. Users load PromptTrap because it gives them access to corporate resources from their AI tools. The security telemetry is a side effect of providing that access.

**Target users:** CISOs, security teams, and IT administrators who need visibility into enterprise AI usage. Secondary users are developers and knowledge workers who want sanctioned AI access to internal resources.

**License:** Apache 2.0

**Author:** Ward Spangler / AltGreen Research LLC
**Repository:** github.com/wardspan/prompttrap

---

## Architecture

```
AI Client (Claude Desktop, Cursor, VS Code, etc.)
    │
    └── PromptTrap MCP Server (stdio transport for v1)
            │
            ├── Tool Layer (passthrough tools with instrumentation)
            │     ├── file_read / file_write / file_list
            │     ├── web_fetch
            │     ├── shell_exec (optional, configurable)
            │     ├── db_query (optional, configurable)
            │     └── [extensible — users can add custom tools]
            │
            ├── Policy Engine
            │     ├── DLP Scanner (regex + pattern matching)
            │     │     ├── Credit card numbers
            │     │     ├── SSNs
            │     │     ├── API keys / secrets (AWS, GCP, Azure, GitHub tokens, etc.)
            │     │     ├── Email addresses (configurable — flag vs block)
            │     │     └── Custom patterns (user-defined regex)
            │     │
            │     ├── Policy Rules (YAML config)
            │     │     ├── Allow/deny tool access per user/role
            │     │     ├── File path restrictions (e.g., block /etc/shadow)
            │     │     ├── Rate limiting
            │     │     └── Content classification flags
            │     │
            │     └── Action on violation: LOG | WARN | BLOCK (configurable per rule)
            │
            ├── Logging / Telemetry
            │     ├── Structured JSON logs to stdout (default)
            │     ├── SQLite local database (optional)
            │     ├── Log fields:
            │     │     ├── timestamp
            │     │     ├── user identity (from config or env)
            │     │     ├── tool name
            │     │     ├── tool input parameters
            │     │     ├── tool output (truncated/hashed for sensitive content)
            │     │     ├── DLP scan results (findings, severity)
            │     │     ├── policy evaluation result (allowed/blocked/warned)
            │     │     ├── session_id
            │     │     └── latency_ms
            │     │
            │     └── Future: webhook output, SIEM integration (syslog/CEF/OCSF)
            │
            └── Dashboard (v1: simple terminal-based or basic web UI)
                  ├── Recent activity feed
                  ├── DLP findings summary
                  ├── Tool usage breakdown
                  └── Session timeline view
```

---

## Tech Stack

- **Language:** TypeScript (best MCP SDK support, broadest client compatibility)
- **MCP SDK:** `@modelcontextprotocol/sdk` (latest)
- **Transport:** stdio (v1) — works with Claude Desktop, Cursor, etc.
- **Schema validation:** Zod
- **Config:** YAML config file (`prompttrap.yaml`)
- **Storage:** SQLite via `better-sqlite3` for local audit log
- **Dashboard:** Simple HTML/JS served from a local Express server (optional, separate process)
- **Package manager:** npm
- **Build:** tsup or tsc
- **Testing:** vitest

---

## Project Structure

```
prompttrap/
├── CLAUDE.md                    # This file
├── README.md                    # GitHub readme with install/usage instructions
├── LICENSE                      # Apache 2.0
├── package.json
├── tsconfig.json
├── prompttrap.example.yaml      # Example configuration
├── src/
│   ├── index.ts                 # Entry point — starts MCP server
│   ├── server.ts                # MCP server setup and tool registration
│   ├── config.ts                # YAML config loader and validation
│   ├── tools/                   # Tool implementations
│   │   ├── index.ts             # Tool registry — auto-discovers and registers tools
│   │   ├── file-tools.ts        # file_read, file_write, file_list
│   │   ├── web-tools.ts         # web_fetch
│   │   ├── shell-tools.ts       # shell_exec (disabled by default)
│   │   └── db-tools.ts          # db_query (disabled by default)
│   ├── policy/                  # Policy engine
│   │   ├── engine.ts            # Core policy evaluation logic
│   │   ├── dlp-scanner.ts       # DLP pattern matching
│   │   └── patterns.ts          # Built-in DLP patterns (CC, SSN, API keys, etc.)
│   ├── logging/                 # Logging and telemetry
│   │   ├── logger.ts            # Structured JSON logger
│   │   ├── store.ts             # SQLite audit log store
│   │   └── types.ts             # Log entry types
│   └── dashboard/               # Optional web dashboard
│       ├── server.ts            # Express server for dashboard
│       └── public/              # Static HTML/JS/CSS
│           └── index.html       # Single-page dashboard
├── test/
│   ├── dlp-scanner.test.ts
│   ├── policy-engine.test.ts
│   └── tools.test.ts
└── scripts/
    └── demo.ts                  # Replay a synthetic session for demo purposes
```

---

## Configuration File (`prompttrap.yaml`)

```yaml
# PromptTrap Configuration
server:
  name: "prompttrap"
  version: "0.1.0"

identity:
  # How to identify the current user
  # Options: env (reads USER env var), static (hardcoded), header
  method: "env"
  env_var: "USER"
  # static_user: "jane.doe@company.com"

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
    allowed_domains: []  # empty = allow all
    denied_domains:
      - "*.internal.company.com"

  shell:
    enabled: false  # disabled by default — high risk
    allowed_commands: []
    denied_commands:
      - "rm -rf"
      - "curl"  # use web_fetch instead

  database:
    enabled: false
    connection_string: ""  # user must configure
    read_only: true

dlp:
  enabled: true
  action: "log"  # log | warn | block
  patterns:
    credit_cards: true
    ssn: true
    api_keys: true
    emails: false  # too noisy for most use cases
    custom: []
    # - name: "internal_project_code"
    #   pattern: "PROJ-[A-Z]{3}-\\d{4}"
    #   severity: "medium"

logging:
  stdout: true
  sqlite:
    enabled: true
    path: "./prompttrap.db"
  # Future: webhook, syslog, OCSF

dashboard:
  enabled: true
  port: 9099
  # bind: "127.0.0.1"  # localhost only by default
```

---

## Implementation Priority

### Phase 1: Core MCP Server (ship this first)
1. Project scaffolding (package.json, tsconfig, build)
2. Config loader (YAML → validated TypeScript types)
3. MCP server with stdio transport
4. `file_read` and `file_list` tools with path restriction enforcement
5. Structured JSON logging to stdout for every tool call
6. Basic DLP scanner (credit cards, SSNs, API key patterns)
7. SQLite audit log
8. README with Claude Desktop configuration instructions

### Phase 2: More Tools + Dashboard
1. `web_fetch` tool
2. `file_write` tool
3. Policy engine with YAML-driven allow/deny rules
4. Basic web dashboard (Express + static HTML)
5. `shell_exec` tool (disabled by default, with warnings)

### Phase 3: Polish for Open Source Release
1. Demo/replay script showing a synthetic session
2. npm package publishing
3. Docker container option
4. Example SIEM integration (webhook output)
5. GitHub Actions CI

---

## Key Design Decisions

1. **Every tool call goes through the policy engine.** Even if no policies are configured, every invocation is logged. This is non-negotiable — it's the core value proposition.

2. **DLP scanning runs on both inputs AND outputs.** A user might not send sensitive data in their request, but the tool response (e.g., reading a file) might contain it.

3. **Default to open, log everything, block nothing.** Out of the box, PromptTrap should work as a transparent passthrough that logs. Users opt into blocking/enforcement. This maximizes adoption.

4. **Configuration is a single YAML file.** No database migrations, no environment variable soup. One file to understand the whole policy.

5. **The dashboard is optional and runs separately.** The MCP server itself is headless (stdio). The dashboard reads from the SQLite database. They don't need to run together.

6. **Tool annotations are set correctly.** Mark read-only tools as `readOnlyHint: true`, destructive tools as `destructiveHint: true`. This matters for client behavior.

---

## MCP Client Configuration

For Claude Desktop, the user adds this to their `claude_desktop_config.json`:

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

---

## DLP Patterns (Built-in)

These should be well-tested and have low false-positive rates:

- **Credit Cards:** Luhn-validated 13-19 digit sequences (Visa, MC, Amex, Discover)
- **SSN:** `\d{3}-\d{2}-\d{4}` with validity checks (no 000, 666, 9xx group)
- **AWS Access Keys:** `AKIA[0-9A-Z]{16}`
- **AWS Secret Keys:** 40-char base64 strings near AWS context
- **GitHub Tokens:** `ghp_[A-Za-z0-9]{36}`, `gho_`, `ghu_`, `ghs_`, `ghr_`
- **Slack Tokens:** `xoxb-`, `xoxp-`, `xoxs-`
- **Generic API Keys:** `[A-Za-z0-9]{32,}` near keywords like "key", "token", "secret", "password"
- **Private Keys:** `-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----`
- **Connection Strings:** patterns matching JDBC, MongoDB, PostgreSQL, MySQL URIs with credentials

---

## Testing Strategy

- **DLP Scanner:** Test each pattern against known-good matches AND known false positives. Include edge cases (formatted vs unformatted CC numbers, SSNs with/without dashes).
- **Policy Engine:** Test allow/deny path rules, rate limiting, tool enable/disable.
- **Tools:** Test file operations respect path restrictions. Test that denied operations actually fail gracefully.
- **Integration:** End-to-end test: invoke a tool, verify the log entry exists in SQLite with correct fields.

---

## What Success Looks Like

A security person can:
1. `npm install -g prompttrap`
2. Add it to their Claude Desktop config
3. Use Claude normally for 30 minutes
4. Open the dashboard and see exactly what tools were called, what data flowed through, and whether any sensitive data was detected
5. Share a screenshot of the dashboard on LinkedIn with the caption "Do you know what your AI tools are doing with your data?"

That screenshot moment is the entire product.
