"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";
import { LLMProvider } from "@/lib/api/types";

export function useLLMProviders() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["llm-providers"],
    queryFn: () => api.get<LLMProvider[]>("/settings/api-key/providers"),
    // Both submit/delete mutations below invalidate this key explicitly,
    // so a long staleTime only affects passive background refetching, not
    // freshness after an actual change. OnboardingShield polls this on
    // every protected-route mount; it doesn't need to re-fetch every few
    // seconds.
    staleTime: 5 * 60 * 1000,
  });
}

interface SubmitKeyVariables {
  provider: string;
  api_key: string;
}

interface SubmitKeyResponse {
  provider: string;
  key_prefix: string;
}

export function useSubmitLLMKey() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<SubmitKeyResponse, ApiError, SubmitKeyVariables>({
    mutationFn: (vars) => api.post<SubmitKeyResponse>("/settings/api-key", vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-providers"] });
    },
  });
}

export function useDeleteLLMKey() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    // provider is a query param here (not a path segment) to match the
    // backend's GET/DELETE .../api-key?provider=... shape.
    mutationFn: (provider) => api.delete(`/settings/api-key?provider=${encodeURIComponent(provider)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-providers"] });
    },
  });
}
