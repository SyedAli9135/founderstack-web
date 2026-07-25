"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";
import { Integration } from "@/lib/api/types";
import { toast } from "sonner";

export function useIntegrations() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["integrations"],
    queryFn: () => api.get<Integration[]>("/integrations"),
  });
}

export function useConnectIntegration() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ service, key }: { service: string; key?: string }) => {
      // The backend expects an optional JSON payload with "key" parameter
      const payload = key ? { key } : {};
      return api.post<{ redirect_url?: string; status?: string }>(
        `/integrations/${service}/connect`,
        payload
      );
    },
    onSuccess: (data, variables) => {
      if (data.redirect_url) {
        // Redirect browser to OAuth authorization URL (e.g. Slack/Notion)
        window.location.href = data.redirect_url;
      } else {
        // Direct integration via key (Stripe/GitHub)
        queryClient.invalidateQueries({ queryKey: ["integrations"] });
        toast.success(`${variables.service.toUpperCase()} Connected!`, {
          description: "Integration state updated to active.",
        });
      }
    },
    onError: (err: any) => {
      toast.error("Connection Failed", {
        description: err.message || "An unexpected error occurred.",
      });
    },
  });
}

export function useDisconnectIntegration() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (service: string) => api.delete<{ status: string }>(`/integrations/${service}`),
    onSuccess: (_, service) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(`${service.toUpperCase()} Disconnected`, {
        description: "The integration access token was revoked successfully.",
      });
    },
    onError: (err: any) => {
      toast.error("Disconnection Failed", {
        description: err.message || "Could not revoke integration token.",
      });
    },
  });
}
