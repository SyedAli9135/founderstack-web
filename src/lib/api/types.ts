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

// More backend DTO standard types will be added here!
