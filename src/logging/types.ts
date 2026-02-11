export type DLPFinding = {
  pattern: string;
  severity: 'low' | 'medium' | 'high';
  location: string;
  redacted_sample?: string;
};

export type PolicyResult = {
  allowed: boolean;
  action: 'allow' | 'warn' | 'block';
  reason?: string;
};

export type LogEntry = {
  timestamp: string;
  session_id: string;
  user: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output?: string;
  dlp_findings: DLPFinding[];
  policy_result: PolicyResult;
  latency_ms: number;
  error?: string;
};
