"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";
import { Integration } from "@/lib/api/types";
import { toast } from "sonner";

export function useIntegrations() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["integrations"],
    queryFn: () => api.get<Integration[]>("/integrations"),
  });
}

interface ConnectResponse {
  redirect_url?: string;
  status?: string;
}

interface ConnectVariables {
  service: string;
  key?: string;
}

// Catalog keys are lowercase/underscored ("google_drive") — this is only
// for toast copy, not anywhere the exact catalog name is required.
function displayName(service: string): string {
  return service.charAt(0).toUpperCase() + service.slice(1).replace(/_/g, " ");
}

export function useConnectIntegration() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<ConnectResponse, ApiError, ConnectVariables>({
    mutationFn: ({ service, key }) => {
      // The backend's unified /connect endpoint ignores the body entirely
      // for OAuth services — the payload only matters for key-based ones.
      const payload = key ? { key } : {};
      return api.post<ConnectResponse>(`/integrations/${service}/connect`, payload);
    },
    onSuccess: (data, variables) => {
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(`${displayName(variables.service)} connected`);
    },
    onError: (err) => {
      toast.error("Connection failed", { description: err.message });
    },
  });
}

export function useDisconnectIntegration() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, ApiError, string>({
    mutationFn: (service) => api.delete<{ status: string }>(`/integrations/${service}`),
    onSuccess: (_, service) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(`${displayName(service)} disconnected`);
    },
    onError: (err) => {
      toast.error("Disconnect failed", { description: err.message });
    },
  });
}
