"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";

export interface DigestSettings {
  digest_enabled: boolean;
  digest_send_hour: number;
  digest_timezone: string;
}

export function useDigestSettings() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["settings", "digest"],
    queryFn: () => api.get<DigestSettings>("/settings/digest"),
  });
}

export function useUpdateDigestSettings() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<DigestSettings, ApiError, DigestSettings>({
    mutationFn: (settings) => api.put<DigestSettings>("/settings/digest", settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "digest"] });
    },
  });
}

export function useSendTestDigest() {
  const api = useApiClient();
  return useMutation<{ status: string }, ApiError, void>({
    mutationFn: () => api.post<{ status: string }>("/settings/digest/test", {}),
  });
}
