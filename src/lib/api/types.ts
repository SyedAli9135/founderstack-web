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

// Workflow 9 — matches internal/api/runs/handler.go's runSummary/runDetail
// and internal/core/graph's Engine.Bus events exactly. A run's lifecycle:
// pending -> running -> (awaiting_approval ->)* completed | failed | cancelled.
export type RunStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: RunStatus;
  output?: string;
  cost_so_far_usd: number;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  created_at: string;
}

export interface RunDetail extends WorkflowRun {
  current_node?: string;
  triggered_by?: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  tool_call_count: number;
}

// The 5 nodes graph.BuildNodes registers — "approval_gate" only ever
// appears in the stream when a destructive/financial tool call actually
// suspends the run for a human decision.
export type RunNodeName = "planner" | "executor" | "approval_gate" | "validator" | "reporter";

// workflow 11's persisted trace — matches GET /runs/{id}/steps' workflowStep
// exactly. Distinct from RunEvent above: this is the durable Postgres
// record (available after a run finishes, or for a run whose live SSE
// events never arrived), not the live stream.
export type StepType = "planning" | "reasoning" | "tool_call" | "approval" | "validation" | "report";

export interface WorkflowStep {
  node_name: RunNodeName;
  step_type: StepType;
  agent_name?: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  input_tokens?: number;
  output_tokens?: number;
  duration_ms?: number;
  status?: "completed" | "failed";
  created_at: string;
}

// matches GET /runs/{id}/cost's costBreakdownItem — cost_ledger only ever
// writes llm_inference/tool_call today (see internal/api/runs/handler.go's
// Cost doc comment); embedding/reranking exist as possible cost_type
// values but have no writer until workflow 12's RAG-query path lands.
export type CostType = "llm_inference" | "tool_call" | "embedding" | "reranking";

export interface RunCostItem {
  cost_type: CostType;
  total_usd: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
}

export interface RunCost {
  items: RunCostItem[];
  total_usd: number;
}

export type RunEventType =
  | "node_start"
  | "node_end"
  | "reasoning"
  | "tool_call"
  | "tool_result"
  | "approval_required"
  | "error"
  | "token"
  | "complete";

// reasoning's data — the model's own text on a turn, surfaced live even
// when that turn also requests a tool call (real providers routinely
// return both — see graph.executorNode's EventReasoning publish). This is
// the model's stated intent right before it acts, not just its final
// answer.
export interface ReasoningEventData {
  text: string;
}

export interface ToolCallEventData {
  tool: string;
  args?: Record<string, unknown>;
}

export interface ToolResultEventData {
  tool: string;
  is_error: boolean;
  // The tool's actual output (or error text), truncated server-side —
  // added alongside is_error so the feed can show what actually came
  // back, not just a bare succeeded/failed flag.
  result?: string;
}

// node_start/node_end's data — matches graph.NodeTransitionData exactly.
export interface NodeTransitionEventData {
  node: RunNodeName;
  agent_name: string;
}

// complete's data — matches graph.CompleteData exactly.
export interface CompleteEventData {
  output: string;
  token_usage: { input_tokens: number; output_tokens: number; cached_tokens: number };
  cost_so_far_usd: number;
}

// approval_required's data — matches graph.ApprovalRequiredData exactly.
// Carries everything ApprovalCard needs to render inline the moment a run
// suspends, without a second GET /approvals/{id} round trip.
export interface ApprovalRequiredEventData {
  approval_id: string;
  risk_level: RiskLevel;
  tool_calls: { id: string; name: string; args?: Record<string, unknown> }[];
}

// RunEvent.data's shape depends on RunEvent.type: NodeTransitionEventData
// for node_start/node_end, ToolCallEventData for tool_call,
// ToolResultEventData for tool_result, CompleteEventData for complete,
// ApprovalRequiredEventData for approval_required, or a plain error string
// for error. See internal/core/graph's Event/EventBus.
export interface RunEvent {
  type: RunEventType;
  run_id: string;
  data?:
    | string
    | NodeTransitionEventData
    | ReasoningEventData
    | ToolCallEventData
    | ToolResultEventData
    | CompleteEventData
    | ApprovalRequiredEventData;
  timestamp: string;
}

// Workflow 10 — matches internal/api/approvals/handler.go's
// approvalSummary exactly. context_data is the pending tool-call batch
// (same shape as ApprovalRequiredEventData.tool_calls), sent as raw JSON
// bytes by the backend rather than a typed field.
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type RiskLevel = "read" | "write_reversible" | "write_destructive_or_financial";

export interface Approval {
  id: string;
  run_id: string;
  status: ApprovalStatus;
  risk_level: RiskLevel;
  context_data: { id: string; name: string; args?: Record<string, unknown> }[];
  expires_at?: string;
  created_at: string;
}

