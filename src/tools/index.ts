import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { z } from 'zod'
import {
  FileReadArgsSchema,
  FileListArgsSchema,
  FileWriteArgsSchema,
  fileRead,
  fileList,
  fileWrite,
} from './file-tools.js'
import { WebFetchArgsSchema, webFetch } from './web-tools.js'
import type { Config } from '../config.js'
import type { PolicyEngine } from '../policy/engine.js'
import type { DLPScanner } from '../policy/dlp-scanner.js'
import type { Logger } from '../logging/logger.js'
import type { LogEntry, PolicyResult, DLPFinding } from '../logging/types.js'
import { getUserIdentity } from '../config.js'
import { randomUUID } from 'crypto'

const sessionId = randomUUID()

/**
 * Register all tools with the MCP server
 */
export function registerTools(
  server: Server,
  config: Config,
  policyEngine: PolicyEngine,
  dlpScanner: DLPScanner,
  logger: Logger
): void {
  // Helper to wrap tool execution with policy and logging
  async function executeTool<T extends z.ZodType>(
    toolName: string,
    args: unknown,
    schema: T,
    handler: (validatedArgs: z.infer<T>) => Promise<string>
  ): Promise<string> {
    const startTime = Date.now()
    let output: string | undefined
    let error: string | undefined
    let dlpFindings: DLPFinding[] = []
    let policyResult: PolicyResult

    try {
      // Validate arguments
      const validatedArgs = schema.parse(args)

      // Evaluate policy
      policyResult = policyEngine.evaluateToolCall(toolName, validatedArgs)

      if (!policyResult.allowed) {
        error = policyResult.reason || 'Access denied by policy'
        throw new Error(error)
      }

      // Execute the tool
      output = await handler(validatedArgs)

      // Scan for DLP violations
      if (config.dlp.enabled) {
        dlpFindings = dlpScanner.scanToolCall(toolName, validatedArgs, output)

        // Take action based on DLP findings and config
        if (dlpFindings.length > 0) {
          const dlpAction = policyEngine.getDLPAction()

          if (dlpAction === 'block') {
            policyResult = {
              allowed: false,
              action: 'block',
              reason: `DLP violation: ${dlpFindings.length} sensitive pattern(s) detected`,
            }
            throw new Error(policyResult.reason)
          } else if (dlpAction === 'warn') {
            // Log warning but allow operation to proceed
            policyResult.action = 'warn'
          }
        }
      }

      return output
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      // Always log the tool call
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        user: getUserIdentity(config),
        tool_name: toolName,
        tool_input: args as Record<string, unknown>,
        tool_output: output ? logger.sanitizeOutput(output) : undefined,
        dlp_findings: dlpFindings,
        policy_result: policyResult!,
        latency_ms: Date.now() - startTime,
        error,
      }

      logger.log(logEntry)
    }
  }

  // Register unified tools/call handler
  server.setRequestHandler(
    z.object({
      method: z.literal('tools/call'),
    }),
    async request => {
      const { name, arguments: args } = request.params as { name: string; arguments: unknown }

      let result: string

      switch (name) {
        case 'file_read':
          result = await executeTool('file_read', args, FileReadArgsSchema, fileRead)
          break

        case 'file_list':
          result = await executeTool('file_list', args, FileListArgsSchema, fileList)
          break

        case 'file_write':
          result = await executeTool('file_write', args, FileWriteArgsSchema, fileWrite)
          break

        case 'web_fetch':
          result = await executeTool('web_fetch', args, WebFetchArgsSchema, webFetch)
          break

        default:
          throw new Error(`Unknown tool: ${name}`)
      }

      return {
        content: [{ type: 'text', text: result }],
      }
    }
  )
}

/**
 * List all available tools based on config
 */
export function getToolsList(config: Config) {
  const tools = []

  if (config.tools.file.enabled) {
    tools.push({
      name: 'file_read',
      description: 'Read the contents of a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path to the file to read',
          },
        },
        required: ['path'],
      },
      readOnlyHint: true,
    })

    tools.push({
      name: 'file_list',
      description: 'List files in a directory',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The directory path to list',
          },
        },
        required: ['path'],
      },
      readOnlyHint: true,
    })

    tools.push({
      name: 'file_write',
      description: 'Write content to a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path to the file to write',
          },
          content: {
            type: 'string',
            description: 'The content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
      destructiveHint: true,
    })
  }

  if (config.tools.web.enabled) {
    tools.push({
      name: 'web_fetch',
      description: 'Fetch content from a URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to fetch',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE'],
            description: 'HTTP method',
            default: 'GET',
          },
          headers: {
            type: 'object',
            description: 'HTTP headers',
          },
          body: {
            type: 'string',
            description: 'Request body for POST/PUT',
          },
        },
        required: ['url'],
      },
      readOnlyHint: true,
    })
  }

  return tools
}
