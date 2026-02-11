import { z } from 'zod';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

// Zod schema for configuration validation
const CustomDLPPatternSchema = z.object({
  name: z.string(),
  pattern: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
});

const ConfigSchema = z.object({
  server: z.object({
    name: z.string().default('prompttrap'),
    version: z.string().default('0.1.0'),
  }).default({}),

  identity: z.object({
    method: z.enum(['env', 'static', 'header']).default('env'),
    env_var: z.string().default('USER'),
    static_user: z.string().optional(),
  }).default({}),

  tools: z.object({
    file: z.object({
      enabled: z.boolean().default(true),
      allowed_paths: z.array(z.string()).default([]),
      denied_paths: z.array(z.string()).default([]),
      max_file_size_mb: z.number().default(10),
    }).default({}),

    web: z.object({
      enabled: z.boolean().default(true),
      allowed_domains: z.array(z.string()).default([]),
      denied_domains: z.array(z.string()).default([]),
    }).default({}),

    shell: z.object({
      enabled: z.boolean().default(false),
      allowed_commands: z.array(z.string()).default([]),
      denied_commands: z.array(z.string()).default([]),
    }).default({}),

    database: z.object({
      enabled: z.boolean().default(false),
      connection_string: z.string().default(''),
      read_only: z.boolean().default(true),
    }).default({}),
  }).default({}),

  dlp: z.object({
    enabled: z.boolean().default(true),
    action: z.enum(['log', 'warn', 'block']).default('log'),
    patterns: z.object({
      credit_cards: z.boolean().default(true),
      ssn: z.boolean().default(true),
      api_keys: z.boolean().default(true),
      emails: z.boolean().default(false),
      custom: z.array(CustomDLPPatternSchema).default([]),
    }).default({}),
  }).default({}),

  logging: z.object({
    stdout: z.boolean().default(true),
    sqlite: z.object({
      enabled: z.boolean().default(true),
      path: z.string().default('./prompttrap.db'),
    }).default({}),
  }).default({}),

  dashboard: z.object({
    enabled: z.boolean().default(true),
    port: z.number().default(9099),
    bind: z.string().default('127.0.0.1'),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type CustomDLPPattern = z.infer<typeof CustomDLPPatternSchema>;

/**
 * Load and validate configuration from a YAML file
 */
export function loadConfig(configPath?: string): Config {
  const path = configPath || process.env.PROMPTTRAP_CONFIG || './prompttrap.yaml';

  // If no config file exists, return default config
  if (!fs.existsSync(path)) {
    console.error(`[PromptTrap] No config file found at ${path}, using defaults`);
    return ConfigSchema.parse({});
  }

  try {
    const fileContents = fs.readFileSync(path, 'utf8');
    const data = yaml.load(fileContents);
    return ConfigSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[PromptTrap] Config validation error:', error.errors);
      throw new Error('Invalid configuration file');
    }
    throw error;
  }
}

/**
 * Get the current user identity based on config
 */
export function getUserIdentity(config: Config): string {
  switch (config.identity.method) {
    case 'env':
      return process.env[config.identity.env_var] || 'unknown';
    case 'static':
      return config.identity.static_user || 'unknown';
    case 'header':
      // For future use with HTTP transport
      return 'unknown';
    default:
      return 'unknown';
  }
}
