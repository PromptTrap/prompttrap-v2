# Changelog

All notable changes to PromptTrap will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-11

### Added

#### Phase 1: Core MCP Server
- **MCP Server** with stdio transport for Claude Desktop compatibility
- **File Tools**: `file_read`, `file_list`, `file_write` with path restrictions
- **Policy Engine** with configurable allow/deny path rules using glob patterns
- **DLP Scanner** with 10 built-in patterns:
  - Credit cards (Luhn-validated)
  - Social Security Numbers (validity checked)
  - AWS access keys and secret keys
  - GitHub tokens (PATs, OAuth, user-to-server, server)
  - Slack tokens
  - Private keys (RSA, EC, OpenSSH)
  - Database connection strings
  - Generic API keys
  - Email addresses (optional)
- **Audit Logging**:
  - Structured JSON output to stdout
  - SQLite database for queryable audit logs
  - Complete tool call tracking with inputs, outputs, DLP findings, and policy decisions
- **YAML Configuration** with Zod validation
- **User Identity** tracking (env-based, static, or header-based)
- **Test Suite**: 41 tests with comprehensive coverage of DLP and policy engine

#### Phase 2: Web Tools & Dashboard
- **web_fetch Tool** with HTTP support (GET, POST, PUT, DELETE)
- **Domain Restrictions** with wildcard pattern matching (e.g., `*.github.com`)
- **Express Dashboard** with real-time monitoring:
  - Activity feed showing recent tool calls
  - DLP findings summary with severity breakdown
  - Tool usage visualization chart
  - Session timeline with user tracking
  - Auto-refresh every 3 seconds
- **Dashboard API** with 4 RESTful endpoints
- **Dark Theme UI** with vanilla JavaScript (no frameworks)

#### Phase 3: Production Readiness
- **Demo Script** (`npm run demo`) that simulates realistic AI sessions with DLP findings
- **GitHub Actions CI** workflow for automated testing
- **Docker Support**:
  - Dockerfile for containerized deployment
  - Docker Compose configuration
  - Health checks
- **npm Publishing** configuration with `prepublishOnly` hook
- **Documentation**:
  - Comprehensive README with usage examples
  - CONTRIBUTING.md for development guidelines
  - FAQ section
  - Docker deployment instructions
  - Screenshot placeholders

### Security
- Default-deny for sensitive paths (`.ssh`, `.env`, `/etc/shadow`, etc.)
- DLP scanning on both tool inputs and outputs
- Configurable policy actions (log, warn, block)
- Shell tools disabled by default (high-risk)
- All data stays local (no external calls except user-initiated `web_fetch`)

### Performance
- Minimal overhead (10-50ms per tool call)
- Asynchronous logging where possible
- Efficient SQLite indexing for audit queries

## [Unreleased]

### Planned
- Shell execution tool (disabled by default, with warnings)
- Database query tool for sanctioned database access
- SIEM integration (syslog, webhook output, OCSF format)
- Rate limiting and user role support
- npm package publication
- Additional DLP patterns based on community feedback

---

[0.1.0]: https://github.com/wardspan/prompttrap/releases/tag/v0.1.0
