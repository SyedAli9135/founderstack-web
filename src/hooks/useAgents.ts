"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";
import { Agent, AgentPolicyScope, AgentToolOption } from "@/lib/api/types";
import { toast } from "sonner";

export function useAgents() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => api.get<Agent[]>("/agents"),
  });
}

export function useAgent(id: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["agents", id],
    queryFn: () => api.get<Agent>(`/agents/${id}`),
    enabled: !!id,
  });
}

// Populates the create/edit form's allowed-tools multi-select — only
// tools from services the org has actually connected, per the backend's
// own filtering (see internal/api/agents/handler.go's ListAvailableTools).
export function useAvailableTools() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["agents", "tools"],
    queryFn: () => api.get<AgentToolOption[]>("/agents/tools"),
  });
}

export interface AgentFormInput {
  name: string;
  description?: string;
  agent_type: string;
  model?: string;
  system_prompt: string;
  max_output_tokens?: number;
  temperature?: number;
  policy_scope: AgentPolicyScope;
}

export function useCreateAgent() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Agent, ApiError, AgentFormInput>({
    mutationFn: (input) => api.post<Agent>("/agents", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (err) => {
      toast.error("Could not create agent", { description: err.message });
    },
  });
}

export function useUpdateAgent() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Agent, ApiError, { id: string; input: Partial<AgentFormInput> }>({
    mutationFn: ({ id, input }) => api.patch<Agent>(`/agents/${id}`, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agents", id] });
    },
    onError: (err) => {
      toast.error("Could not update agent", { description: err.message });
    },
  });
}

export function useDeleteAgent() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent deleted");
    },
    onError: (err) => {
      toast.error("Could not delete agent", { description: err.message });
    },
  });
}
