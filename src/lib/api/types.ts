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

