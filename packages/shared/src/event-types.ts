/**
 * Shared event types for both MCP server and browser extension
 */

import type { DLPFinding } from './dlp-patterns.js';

export type EventSource = 'mcp' | 'browser';

export type EventType =
  | 'tool_call'      // MCP tool invocation
  | 'ai_visit'       // Browser: page visit to AI service
  | 'paste'          // Browser: paste into AI input
  | 'upload'         // Browser: file upload to AI
  | 'text_input'     // Browser: text typed into AI
  | 'dlp_finding';   // Standalone DLP detection

export type PolicyAction = 'allowed' | 'warned' | 'blocked';
export type DLPAction = 'logged' | 'warned' | 'blocked';

export interface BaseEvent {
  timestamp: string;
  source: EventSource;
  event_type: EventType;
  user_id?: string;
  session_id: string;
}

export interface MCPEvent extends BaseEvent {
  source: 'mcp';
  event_type: 'tool_call';
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output_hash?: string;
  policy_result: PolicyAction;
  latency_ms: number;
  dlp_findings: DLPFinding[];
  dlp_severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  dlp_action_taken: DLPAction;
}

export interface BrowserEvent extends BaseEvent {
  source: 'browser';
  domain: string;
  ai_service: string;
  action: 'page_visit' | 'text_input' | 'paste' | 'file_upload';
  input_length?: number;
  duration_seconds?: number;
  dlp_findings: DLPFinding[];
  dlp_severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  dlp_action_taken: DLPAction;
}

export type Event = MCPEvent | BrowserEvent;
