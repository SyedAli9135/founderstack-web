"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";
import { Workflow, WorkflowTriggerType } from "@/lib/api/types";
import { toast } from "sonner";

export function useWorkflows() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.get<Workflow[]>("/workflows"),
  });
}

export function useWorkflow(id: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workflows", id],
    queryFn: () => api.get<Workflow>(`/workflows/${id}`),
    enabled: !!id,
  });
}

export interface WorkflowFormInput {
  agent_id: string;
  name: string;
  description?: string;
  trigger_type: WorkflowTriggerType;
  cron_expression?: string;
  requires_approval?: boolean;
  task_input_template?: string;
  estimated_manual_minutes?: number;
}

export function useCreateWorkflow() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Workflow, ApiError, WorkflowFormInput>({
    mutationFn: (input) => api.post<Workflow>("/workflows", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (err) => {
      toast.error("Could not create workflow", { description: err.message });
    },
  });
}

export function useUpdateWorkflow() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Workflow, ApiError, { id: string; input: Partial<WorkflowFormInput> | { is_active: boolean } }>({
    mutationFn: ({ id, input }) => api.patch<Workflow>(`/workflows/${id}`, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflows", id] });
    },
    onError: (err) => {
      toast.error("Could not update workflow", { description: err.message });
    },
  });
}

export function useDeleteWorkflow() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Workflow deleted");
    },
    onError: (err) => {
      toast.error("Could not delete workflow", { description: err.message });
    },
  });
}

export function useRunWorkflow() {
  const api = useApiClient();

  return useMutation<{ run_id: string; status: string }, ApiError, string>({
    mutationFn: (id) => api.post<{ run_id: string; status: string }>(`/workflows/${id}/run`, {}),
    onSuccess: () => {
      toast.success("Run queued", {
        description: "Execution tracking arrives in a later workflow — this queues the run.",
      });
    },
    onError: (err) => {
      toast.error("Could not queue run", { description: err.message });
    },
  });
}
