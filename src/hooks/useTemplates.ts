"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";
import { AgentTemplateDetail, AgentTemplateSummary } from "@/lib/api/types";
import { toast } from "sonner";

// Workflow 19. Templates are global (no org scoping on the backend —
// see internal/api/templates's own package doc), so these query keys
// don't need an org id the way most other hooks in this app do.

export function useTemplates(category?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["templates", category ?? "all"],
    queryFn: () => api.get<AgentTemplateSummary[]>(`/templates${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  });
}

export function useTemplate(id: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["templates", "detail", id],
    queryFn: () => api.get<AgentTemplateDetail>(`/templates/${id}`),
    enabled: !!id,
  });
}

export function useInstallTemplate() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<{ agent_id: string }, ApiError, string>({
    mutationFn: (templateId) => api.post<{ agent_id: string }>(`/templates/${templateId}/install`, {}),
    onSuccess: () => {
      // The new agent should show up immediately if the founder lands
      // back on the Agents list right after installing.
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (err) => {
      toast.error("Could not install template", { description: err.message });
    },
  });
}
