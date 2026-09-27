"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";
import { SopDeployment, SopDetail, SopInput, SopOverrides, SopSummary, SopToolOption } from "@/lib/api/types";
import { toast } from "sonner";

export function useSops() {
  const api = useApiClient();
  return useQuery<{ sops: SopSummary[]; can_manage: boolean }, ApiError>({
    queryKey: ["sops"],
    queryFn: () => api.get("/practice/sops"),
  });
}

export function useSop(id: string) {
  const api = useApiClient();
  return useQuery<SopDetail, ApiError>({
    queryKey: ["sops", id],
    queryFn: () => api.get(`/practice/sops/${id}`),
  });
}

export function useSopDeployments(id: string) {
  const api = useApiClient();
  return useQuery<{ deployments: SopDeployment[]; current_version: number }, ApiError>({
    queryKey: ["sops", id, "deployments"],
    queryFn: () => api.get(`/practice/sops/${id}/deployments`),
  });
}

// The full catalog, not just this workspace's connected tools — a SOP is
// authored once for many clients.
export function useSopTools() {
  const api = useApiClient();
  return useQuery<SopToolOption[], ApiError>({
    queryKey: ["sops", "tools"],
    queryFn: () => api.get("/practice/sops/tools"),
    staleTime: 10 * 60 * 1000,
  });
}

// Every SOP mutation can change portfolio badges and the managed agents'
// "Managed by SOP" labels, not just the SOP views themselves.
function useInvalidateSops() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["sops"] });
    queryClient.invalidateQueries({ queryKey: ["practice"] });
    queryClient.invalidateQueries({ queryKey: ["agents"] });
    queryClient.invalidateQueries({ queryKey: ["workflows"] });
  };
}

export function useCreateSop() {
  const api = useApiClient();
  const invalidate = useInvalidateSops();
  return useMutation<SopDetail, ApiError, SopInput>({
    mutationFn: (input) => api.post("/practice/sops", input),
    onSuccess: invalidate,
  });
}

export function useUpdateSop(id: string) {
  const api = useApiClient();
  const invalidate = useInvalidateSops();
  return useMutation<SopDetail, ApiError, SopInput>({
    mutationFn: (input) => api.patch(`/practice/sops/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSop() {
  const api = useApiClient();
  const invalidate = useInvalidateSops();
  return useMutation<unknown, ApiError, string>({
    mutationFn: (id) => api.delete(`/practice/sops/${id}`),
    onSuccess: invalidate,
    onError: (err) => toast.error("Could not delete SOP", { description: err.message }),
  });
}

export function useDeploySop(id: string) {
  const api = useApiClient();
  const invalidate = useInvalidateSops();
  return useMutation<SopDeployment, ApiError, { target_org_id: string; parameter_overrides: SopOverrides }>({
    mutationFn: (body) => api.post(`/practice/sops/${id}/deploy`, body),
    onSuccess: invalidate,
  });
}

export function useSyncDeployment(sopId: string) {
  const api = useApiClient();
  const invalidate = useInvalidateSops();
  return useMutation<unknown, ApiError, SopDeployment>({
    mutationFn: (d) => api.post(`/practice/sops/${sopId}/deployments/${d.id}/sync`, {}),
    onSuccess: (_, d) => {
      invalidate();
      toast.success(`${d.workspace_name} is up to date`);
    },
    onError: (err) => toast.error("Could not sync", { description: err.message }),
  });
}

export function useUpdateDeploymentOverrides(sopId: string) {
  const api = useApiClient();
  const invalidate = useInvalidateSops();
  return useMutation<unknown, ApiError, { deployment: SopDeployment; overrides: SopOverrides }>({
    mutationFn: ({ deployment, overrides }) =>
      api.patch(`/practice/sops/${sopId}/deployments/${deployment.id}`, { parameter_overrides: overrides }),
    onSuccess: invalidate,
  });
}

export function useUndeploySop(sopId: string) {
  const api = useApiClient();
  const invalidate = useInvalidateSops();
  return useMutation<unknown, ApiError, SopDeployment>({
    mutationFn: (d) => api.delete(`/practice/sops/${sopId}/deployments/${d.id}`),
    onSuccess: (_, d) => {
      invalidate();
      toast.success(`Removed from ${d.workspace_name}`);
    },
    onError: (err) => toast.error("Could not remove", { description: err.message }),
  });
}
