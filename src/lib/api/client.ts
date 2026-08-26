import { useAuth } from "@clerk/nextjs";

let apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Ensure the base URL always points to the correct API version suffix
if (!apiBaseUrl.endsWith("/api/v1")) {
  apiBaseUrl = `${apiBaseUrl.replace(/\/$/, "")}/api/v1`;
}

// Exported for useWorkflowStream — SSE can't go through fetchApi below (it
// needs the response body as a stream, not JSON-parsed), but still needs
// the same base URL and Clerk-token-as-Bearer-header auth.
export const API_BASE_URL = apiBaseUrl;

interface ErrorEnvelope {
  status: "error";
  error: {
    code?: string;
    message?: string;
    request_id?: string;
  };
}

/** Thrown by every request the client makes when the backend responds
 * with its standard ErrorEnvelope — carries the same code/request_id a
 * human would see in the server logs, so a caller can show or log
 * something more useful than a generic "request failed". */
export class ApiError extends Error {
  code?: string;
  requestId?: string;
  statusCode: number;

  constructor(message: string, statusCode: number, code?: string, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
  }
}

export function useApiClient() {
  const { getToken } = useAuth();

  const fetchApi = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    // Automatically retrieve the Clerk JWT token mapped to this user session
    const token = await getToken();

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const body: Partial<ErrorEnvelope> & { data?: T } = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = body.error?.message || `API error: ${response.statusText}`;
      const requestId = response.headers.get("X-Request-ID") || body.error?.request_id;
      const error = new ApiError(message, response.status, body.error?.code, requestId);

      console.error(`[API Error]${requestId ? ` (ReqID: ${requestId})` : ""} ${message}`);
      throw error;
    }

    // Backend success format: { status: "success", data: T, message: "..." }
    return body.data as T;
  };

  return {
    get: <T>(endpoint: string, options?: RequestInit) =>
      fetchApi<T>(endpoint, { ...options, method: "GET" }),
    post: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
      fetchApi<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),
    put: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
      fetchApi<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),
    patch: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
      fetchApi<T>(endpoint, { ...options, method: "PATCH", body: JSON.stringify(body) }),
    delete: <T>(endpoint: string, options?: RequestInit) =>
      fetchApi<T>(endpoint, { ...options, method: "DELETE" }),
  };
}
