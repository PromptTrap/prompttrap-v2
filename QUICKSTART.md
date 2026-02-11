# PromptTrap Quick Start Guide

## Local Installation (No npm Required)

Since PromptTrap hasn't been published to npm yet, you can run it directly from the built source.

### Step 1: Verify Build

The project should already be built. Verify the files exist:

```bash
ls -la packages/mcp-server/dist/index.js
ls -la packages/browser-extension/dist/
```

If not built, run:

```bash
npm install
npm run build
```

### Step 2: Configure PromptTrap

A default configuration has been created at `prompttrap.yaml`. You can customize it:

```bash
# Edit the config
nano prompttrap.yaml

# Or use the example as-is (it's already configured with sensible defaults)
```

Key settings to review:
- `tools.file.allowed_paths` - Which directories Claude can access
- `tools.file.denied_paths` - Explicitly blocked paths (secrets, SSH keys, etc.)
- `dlp.action` - What to do when sensitive data detected: `log`, `warn`, or `block`

### Step 3: Add to Claude Desktop

**macOS Claude Desktop Config Location:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows Claude Desktop Config Location:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Add this configuration:**

A pre-filled example is available at `claude_desktop_config.example.json`. 

Open your Claude Desktop config and add:

```json
{
  "mcpServers": {
    "prompttrap": {
      "command": "node",
      "args": ["/Users/ward/Code/prompttrap-v2/packages/mcp-server/dist/index.js"],
      "env": {
        "PROMPTTRAP_CONFIG": "/Users/ward/Code/prompttrap-v2/prompttrap.yaml",
        "USER": "ward@altgreen.com"
      }
    }
  }
}
```

**IMPORTANT:** Use absolute paths! Replace `/Users/ward/Code/prompttrap-v2` with your actual project path if different.

### Step 4: Restart Claude Desktop

1. Quit Claude Desktop completely (Cmd+Q on macOS)
2. Reopen Claude Desktop
3. Check the MCP icon (bottom left) - you should see "prompttrap" connected

### Step 5: Test It

Ask Claude:

```
Can you list the files in my home directory using the file_list tool?
```

Claude should now have access to the PromptTrap tools:
- `file_read` - Read file contents
- `file_list` - List directory contents  
- `file_write` - Write files
- `web_fetch` - Fetch web content

### Step 6: View the Audit Dashboard

Open a new terminal and run:

```bash
cd /Users/ward/Code/prompttrap-v2/packages/mcp-server
npm run dashboard
```

Then open: http://localhost:9099

You'll see:
- 📊 Real-time activity feed of all tool calls
- 🔍 DLP findings (if any sensitive data was detected)
- 📈 Tool usage statistics
- ⏱️ Session timeline

### Step 7: Try the Demo

Want to see what DLP detection looks like? Run the demo:

```bash
cd /Users/ward/Code/prompttrap-v2/packages/mcp-server
npm run demo
```

This simulates a realistic AI session with intentional DLP findings:
- Reading normal files ✅
- Attempting to read `.env` with AWS keys ⚠️ DLP detected
- Reading customer data with SSNs ⚠️ DLP detected
- Trying to access SSH keys 🚫 Blocked by policy
- Web requests ✅

After running the demo, check the dashboard to see all the events logged!

---

## Browser Extension Setup

To monitor web-based AI tools (ChatGPT, Claude.ai, Gemini, etc.):

### Step 1: Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select: `/Users/ward/Code/prompttrap-v2/packages/browser-extension/dist`

### Step 2: Install Native Messaging Host

The extension needs a native messaging host to write to the SQLite database:

**macOS/Linux:**
```bash
cd /Users/ward/Code/prompttrap-v2/packages/browser-extension/dist/native-host
chmod +x install-native-host.sh
./install-native-host.sh
```

**Windows:**
```cmd
cd \Users\ward\Code\prompttrap-v2\packages\browser-extension\dist\native-host
install-native-host.bat
```

### Step 3: Test the Extension

1. Visit https://chatgpt.com or https://claude.ai
2. Try pasting some text with a fake API key: `AKIAIOSFODNN7EXAMPLE`
3. You should see a toast notification warning you about the API key
4. Click the PromptTrap extension icon to see session stats

### Step 4: View Unified Dashboard

Browser events and MCP server events share the same database!

```bash
cd /Users/ward/Code/prompttrap-v2/packages/mcp-server
npm run dashboard
```

Open http://localhost:9099 - you'll see both:
- 🖥️ MCP server events (from Claude Desktop)
- 🌐 Browser extension events (from ChatGPT, Claude.ai, etc.)

All in one unified audit log!

---

## Troubleshooting

### "Module not found" errors

Make sure dependencies are installed:

```bash
npm install
```

### Claude Desktop doesn't show PromptTrap

1. Check the Claude Desktop logs:
   - **macOS**: `~/Library/Logs/Claude/mcp*.log`
   - **Windows**: `%APPDATA%\Claude\logs\`

2. Verify absolute paths in config (no `~` or relative paths)

3. Make sure node is in your PATH:
   ```bash
   which node
   # Should output: /Users/ward/.nvm/versions/node/v18.19.0/bin/node or similar
   ```

### Dashboard shows "No events"

1. The database is created when the first event occurs
2. Try using a tool in Claude Desktop first
3. Check that `prompttrap.db` was created in the project root

### Browser extension not working

1. Check that you loaded from the `dist` folder, not `src`
2. Verify the native messaging host installed correctly:
   ```bash
   # macOS
   ls ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.prompttrap.host.json
   ```
3. Check Chrome extension console for errors (chrome://extensions → Details → Inspect views)

---

## What's Next?

- ✅ Monitor your AI usage through the dashboard
- ✅ Customize DLP patterns in `prompttrap.yaml`
- ✅ Share the dashboard screenshot on LinkedIn to show AI governance in action
- ✅ Deploy the browser extension via Chrome Enterprise (see `packages/browser-extension/docs/ENTERPRISE_DEPLOYMENT.md`)

**Questions or issues?** Check the main README.md or open an issue on GitHub.
