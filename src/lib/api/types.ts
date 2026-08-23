export interface ApiResponse<T> {
  status: string;
  data?: T;
  error?: string;
  checks?: Record<string, string>;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  createdAt: string;
}

export type IntegrationStatus = "connected" | "not_connected" | "expired" | "unknown";

export interface Integration {
  service: string;
  name: string;
  category: string;
  auth_type: "oauth" | "api_key" | "pat";
  status: IntegrationStatus;
  connected_at: string | null;
  scopes: string[];
  description?: string;
}

export interface ApiKeyStatus {
  provider?: string;
  is_valid?: boolean;
  key_prefix?: string;
  updated_at?: string;
  last_used_at?: string;
}

// One entry per LLM provider the backend's BYOK catalog supports
// (anthropic, openai, gemini, qwen, deepseek) — GET /settings/api-key/providers
// always returns all of them, is_configured/is_valid/is_active false and
// key_prefix null for ones this org hasn't touched yet.
export interface LLMProvider {
  provider: string;
  name: string;
  key_prefix_hint: string;
  is_configured: boolean;
  is_valid: boolean;
  is_active: boolean;
  key_prefix: string | null;
  updated_at: string | null;
  last_used_at: string | null;
}

export type DocumentProcessingStatus = "pending" | "processing" | "indexed" | "failed" | "deleting";

export interface AppDocument {
  id: string;
  filename: string;
  category: string;
  processing_status: DocumentProcessingStatus;
  total_chunks: number;
  byte_size: number;
  created_at: string;
  indexed_at?: string | null;
  error_detail?: string | null;
}

export type AgentType = "orchestrator" | "specialist";

export interface AgentPolicyScope {
  max_tool_calls?: number;
  max_cost_per_run_usd?: number;
  allowed_tools: string[];
}

export interface Agent {
  id: string;
  name: string;
  slug: string;
  description?: string;
  agent_type: string;
  model: string;
  system_prompt: string;
  context_window_tokens: number;
  max_output_tokens: number;
  temperature: number;
  policy_scope: AgentPolicyScope;
  allowed_mcp_servers: string[];
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  // Active workflows pointing at this agent (workflow 8) — GET/LIST only;
  // 0 on a freshly created/updated agent. Powers the "N workflows use this
  // agent" warning before deleting one.
  workflow_count: number;
}

// One entry per tool from a service the org has actually connected —
// GET /agents/tools. tool_id is the "service.tool_name" string
// policy_scope.allowed_tools expects.
export interface AgentToolOption {
  service: string;
  name: string;
  tool_id: string;
  description: string;
}

export type WorkflowTriggerType = "manual" | "scheduled" | "webhook";

export interface Workflow {
  id: string;
  agent_id: string;
  agent_name: string;
  name: string;
  description?: string;
  trigger_type: WorkflowTriggerType;
  cron_expression?: string;
  timezone: string;
  next_run_at?: string;
  requires_approval: boolean;
  task_input_template?: string;
  estimated_manual_minutes?: number;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

