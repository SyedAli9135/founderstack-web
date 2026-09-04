"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";
import { RunCost, RunDetail, RunStatus, WorkflowRun, WorkflowStep } from "@/lib/api/types";
import { toast } from "sonner";

export function useRuns(filters?: { status?: RunStatus; workflow_id?: string }) {
  const api = useApiClient();
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.workflow_id) params.set("workflow_id", filters.workflow_id);
  const query = params.toString();

  return useQuery({
    queryKey: ["runs", filters?.status ?? "all", filters?.workflow_id ?? "all"],
    queryFn: () => api.get<{ runs: WorkflowRun[] }>(`/runs${query ? `?${query}` : ""}`),
    select: (res) => res.runs,
    // A run in flight changes state on its own — poll gently so the list
    // page (which has no SSE subscription of its own) doesn't go stale
    // while a founder's looking at it.
    refetchInterval: 5000,
  });
}

export function useRun(id: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["runs", id],
    queryFn: () => api.get<RunDetail>(`/runs/${id}`),
    enabled: !!id,
  });
}

// Steps/cost are only ever meaningful once a run is terminal (or at least
// has done something) — both are read once on mount, not polled, since
// live progress already comes from useWorkflowStream's SSE feed, not these
// REST endpoints.
export function useRunSteps(id: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["runs", id, "steps"],
    queryFn: () => api.get<{ steps: WorkflowStep[] }>(`/runs/${id}/steps`),
    select: (res) => res.steps,
    enabled: !!id,
  });
}

export function useRunCost(id: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["runs", id, "cost"],
    queryFn: () => api.get<RunCost>(`/runs/${id}/cost`),
    enabled: !!id,
  });
}

export function useCancelRun() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<{ run_id: string }, ApiError, string>({
    mutationFn: (id) => api.post<{ run_id: string }>(`/runs/${id}/cancel`, {}),
    onSuccess: () => {
      // Prefix match — covers both the ["runs", id] detail query and
      // every ["runs", status, workflowFilter] list variant.
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      toast.success("Cancellation requested");
    },
    onError: (err) => {
      toast.error("Could not cancel run", { description: err.message });
    },
  });
}
