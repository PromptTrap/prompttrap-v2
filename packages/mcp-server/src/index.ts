import { loadConfig } from './config.js'
import { runServer } from './server.js'

async function main() {
  try {
    // Load configuration
    const config = loadConfig()

    // Start the MCP server
    await runServer(config)
  } catch (error) {
    console.error('[PromptTrap] Fatal error:', error)
    process.exit(1)
  }
}

main()
