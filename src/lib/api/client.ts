import { useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.statusText}`);
    }

    return response.json();
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
