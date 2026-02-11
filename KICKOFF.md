# PromptTrap — Claude Code Kickoff

## How to use this

1. Create a new directory: `mkdir prompttrap && cd prompttrap`
2. Copy the `CLAUDE.md` file into this directory
3. Start Claude Code: `claude`
4. Paste the kickoff prompt below

---

## Kickoff Prompt

```
Read the CLAUDE.md file in this project root. It contains the full architecture, 
design decisions, and implementation plan for PromptTrap — an open-source MCP server 
for AI governance and security visibility.

Start with Phase 1. Build it incrementally:

1. Scaffold the project (package.json, tsconfig.json, build config)
2. Implement the YAML config loader with Zod validation
3. Build the MCP server entry point with stdio transport
4. Implement file_read and file_list tools with path restriction enforcement
5. Build the DLP scanner with the built-in patterns listed in CLAUDE.md
6. Wire up the policy engine so every tool call is evaluated and logged
7. Add the structured JSON logger (stdout) and SQLite audit store
8. Write tests for the DLP scanner and policy engine
9. Create the example prompttrap.yaml config file
10. Write the README with installation and Claude Desktop setup instructions

Build each piece, test it, then move to the next. Commit after each major component. 
Ask me if any design decisions need clarification.
```

---

## Follow-up prompts for subsequent phases

### Phase 2 — Dashboard + More Tools
```
Continue with Phase 2 from CLAUDE.md. Add the web_fetch and file_write tools, 
then build the Express-based dashboard that reads from the SQLite audit log. 
The dashboard should be a single HTML page with:
- Real-time activity feed (polling the SQLite DB)
- DLP findings summary with severity breakdown
- Tool usage chart (which tools are called most)
- Session timeline view
Keep it clean and functional — no frameworks, vanilla JS is fine.
```

### Phase 3 — Demo + Release Prep
```
Continue with Phase 3 from CLAUDE.md. Build the demo replay script that 
simulates a realistic AI session with intentional DLP findings (someone 
reading a .env file with AWS keys, querying a file with customer SSNs, etc). 
Then prepare for open source release: GitHub Actions CI, npm publish config, 
Dockerfile, and polish the README with screenshots/examples.
```
