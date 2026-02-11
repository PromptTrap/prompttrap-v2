import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import type { Config } from './config.js'
import { PolicyEngine } from './policy/engine.js'
import { DLPScanner } from './policy/dlp-scanner.js'
import { getEnabledPatterns } from './policy/patterns.js'
import { Logger } from './logging/logger.js'
import { AuditStore } from './logging/store.js'
import { registerTools, getToolsList } from './tools/index.js'

export async function createServer(config: Config): Promise<Server> {
  // Create server instance
  const server = new Server(
    {
      name: config.server.name,
      version: config.server.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Initialize policy engine
  const policyEngine = new PolicyEngine(config)

  // Initialize DLP scanner with enabled patterns
  const enabledPatterns = getEnabledPatterns(config.dlp.patterns, config.dlp.patterns.custom)
  const dlpScanner = new DLPScanner(enabledPatterns)

  // Initialize audit store
  const auditStore = config.logging.sqlite.enabled ? new AuditStore(config) : undefined

  // Initialize logger
  const logger = new Logger(config, auditStore)

  // Register tools
  registerTools(server, config, policyEngine, dlpScanner, logger)

  // Handle tools/list request
  server.setRequestHandler(
    z.object({
      method: z.literal('tools/list'),
    }),
    async () => {
      return {
        tools: getToolsList(config),
      }
    }
  )

  return server
}

export async function runServer(config: Config): Promise<void> {
  const server = await createServer(config)
  const transport = new StdioServerTransport()

  await server.connect(transport)

  // Log startup (to stderr so it doesn't interfere with stdio protocol)
  console.error('[PromptTrap] Server started')
  console.error(`[PromptTrap] DLP enabled: ${config.dlp.enabled}`)
  console.error(`[PromptTrap] DLP action: ${config.dlp.action}`)
  console.error(`[PromptTrap] File tools enabled: ${config.tools.file.enabled}`)
}
