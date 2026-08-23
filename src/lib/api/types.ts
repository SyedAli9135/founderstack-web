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

