import { useAuth } from "@clerk/nextjs";

let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Ensure the base URL always points to the correct API version suffix
if (!API_BASE_URL.endsWith("/api/v1")) {
  API_BASE_URL = `${API_BASE_URL.replace(/\/$/, "")}/api/v1`;
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

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Handle standardized ErrorEnvelope
      const message = body.error?.message || `API Error: ${response.statusText}`;
      const requestId = response.headers.get("X-Request-ID") || body.error?.request_id;

      const error = new Error(message) as any;
      error.requestId = requestId;
      error.code = body.error?.code;
      error.statusCode = response.status;

      console.error(`[API Error] ${requestId ? `(ReqID: ${requestId})` : ""} ${message}`);
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
    delete: <T>(endpoint: string, options?: RequestInit) =>
      fetchApi<T>(endpoint, { ...options, method: "DELETE" }),
  };
}
