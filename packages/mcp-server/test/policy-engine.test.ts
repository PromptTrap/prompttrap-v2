import { describe, it, expect } from 'vitest'
import { PolicyEngine } from '../src/policy/engine.js'
import type { Config } from '../src/config.js'

const createMockConfig = (overrides?: Partial<Config>): Config => ({
  server: { name: 'test', version: '1.0.0' },
  identity: { method: 'env', env_var: 'USER' },
  tools: {
    file: {
      enabled: true,
      allowed_paths: ['/home', '/tmp'],
      denied_paths: ['/etc/shadow', '**/.env', '**/.ssh/**'],
      max_file_size_mb: 10,
    },
    web: { enabled: true, allowed_domains: [], denied_domains: [] },
    shell: { enabled: false, allowed_commands: [], denied_commands: [] },
    database: { enabled: false, connection_string: '', read_only: true },
  },
  dlp: {
    enabled: true,
    action: 'log',
    patterns: {
      credit_cards: true,
      ssn: true,
      api_keys: true,
      emails: false,
      custom: [],
    },
  },
  logging: {
    stdout: true,
    sqlite: { enabled: false, path: './test.db' },
  },
  dashboard: { enabled: false, port: 9099, bind: '127.0.0.1' },
  ...overrides,
})

describe('PolicyEngine', () => {
  describe('File Path Restrictions', () => {
    it('should allow files in allowed paths', () => {
      const config = createMockConfig()
      const engine = new PolicyEngine(config)

      const result = engine.isPathAllowed('/home/user/document.txt')
      expect(result.allowed).toBe(true)
      expect(result.action).toBe('allow')
    })

    it('should allow files in /tmp', () => {
      const config = createMockConfig()
      const engine = new PolicyEngine(config)

      const result = engine.isPathAllowed('/tmp/tempfile.txt')
      expect(result.allowed).toBe(true)
    })

    it('should block files in denied paths', () => {
      const config = createMockConfig()
      const engine = new PolicyEngine(config)

      const result = engine.isPathAllowed('/etc/shadow')
      expect(result.allowed).toBe(false)
      expect(result.action).toBe('block')
      expect(result.reason).toContain('denied pattern')
    })

    it('should block .env files anywhere', () => {
      const config = createMockConfig()
      const engine = new PolicyEngine(config)

      const result = engine.isPathAllowed('/home/user/project/.env')
      expect(result.allowed).toBe(false)
      expect(result.action).toBe('block')
    })

    it('should block .ssh directories anywhere', () => {
      const config = createMockConfig()
      const engine = new PolicyEngine(config)

      const result = engine.isPathAllowed('/home/user/.ssh/id_rsa')
      expect(result.allowed).toBe(false)
      expect(result.action).toBe('block')
    })

    it('should block paths not in allowed_paths when allowed_paths is set', () => {
      const config = createMockConfig()
      const engine = new PolicyEngine(config)

      const result = engine.isPathAllowed('/var/log/system.log')
      expect(result.allowed).toBe(false)
      expect(result.action).toBe('block')
      expect(result.reason).toContain('not in allowed paths')
    })

    it('should allow all paths when allowed_paths is empty', () => {
      const config = createMockConfig({
        tools: {
          ...createMockConfig().tools,
          file: {
            enabled: true,
            allowed_paths: [],
            denied_paths: ['/etc/shadow'],
            max_file_size_mb: 10,
          },
        },
      })
      const engine = new PolicyEngine(config)

      const result = engine.isPathAllowed('/var/log/system.log')
      expect(result.allowed).toBe(true)
      expect(result.action).toBe('allow')
    })

    it('should block when file tools are disabled', () => {
      const config = createMockConfig({
        tools: {
          ...createMockConfig().tools,
          file: {
            enabled: false,
            allowed_paths: [],
            denied_paths: [],
            max_file_size_mb: 10,
          },
        },
      })
      const engine = new PolicyEngine(config)

      const result = engine.isPathAllowed('/home/user/document.txt')
      expect(result.allowed).toBe(false)
      expect(result.action).toBe('block')
      expect(result.reason).toBe('File tools are disabled')
    })
  })

  describe('Tool Access Control', () => {
    it('should allow file_read when file tools are enabled', () => {
      const config = createMockConfig()
      const engine = new PolicyEngine(config)

      const result = engine.evaluateToolCall('file_read', { path: '/home/user/test.txt' })
      expect(result.allowed).toBe(true)
    })

    it('should block file_read when file tools are disabled', () => {
      const config = createMockConfig({
        tools: {
          ...createMockConfig().tools,
          file: {
            enabled: false,
            allowed_paths: [],
            denied_paths: [],
            max_file_size_mb: 10,
          },
        },
      })
      const engine = new PolicyEngine(config)

      const result = engine.evaluateToolCall('file_read', { path: '/home/user/test.txt' })
      expect(result.allowed).toBe(false)
    })

    it('should block web_fetch when web tools are disabled', () => {
      const config = createMockConfig({
        tools: {
          ...createMockConfig().tools,
          web: { enabled: false, allowed_domains: [], denied_domains: [] },
        },
      })
      const engine = new PolicyEngine(config)

      const result = engine.evaluateToolCall('web_fetch', { url: 'https://example.com' })
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Web tools are disabled')
    })

    it('should block shell_exec when shell tools are disabled', () => {
      const config = createMockConfig()
      const engine = new PolicyEngine(config)

      const result = engine.evaluateToolCall('shell_exec', { command: 'ls' })
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Shell tools are disabled')
    })

    it('should block db_query when database tools are disabled', () => {
      const config = createMockConfig()
      const engine = new PolicyEngine(config)

      const result = engine.evaluateToolCall('db_query', { query: 'SELECT * FROM users' })
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Database tools are disabled')
    })
  })

  describe('DLP Action', () => {
    it('should return log action by default', () => {
      const config = createMockConfig()
      const engine = new PolicyEngine(config)

      expect(engine.getDLPAction()).toBe('log')
    })

    it('should return warn action when configured', () => {
      const config = createMockConfig({
        dlp: {
          ...createMockConfig().dlp,
          action: 'warn',
        },
      })
      const engine = new PolicyEngine(config)

      expect(engine.getDLPAction()).toBe('warn')
    })

    it('should return block action when configured', () => {
      const config = createMockConfig({
        dlp: {
          ...createMockConfig().dlp,
          action: 'block',
        },
      })
      const engine = new PolicyEngine(config)

      expect(engine.getDLPAction()).toBe('block')
    })
  })
})
