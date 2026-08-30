"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";
import { Approval, ApprovalStatus } from "@/lib/api/types";
import { toast } from "sonner";

export function usePendingApprovals() {
  return useApprovals({ status: "pending" });
}

export function useApprovals(filters?: { status?: ApprovalStatus }) {
  const api = useApiClient();
  const query = filters?.status ? `?status=${filters.status}` : "";

  return useQuery({
    queryKey: ["approvals", filters?.status ?? "all"],
    queryFn: () => api.get<{ approvals: Approval[] }>(`/approvals${query}`),
    select: (res) => res.approvals,
    // No SSE subscription of its own on the approvals page/nav badge —
    // poll gently, matching useRuns' own reasoning for the same tradeoff.
    refetchInterval: 10000,
  });
}

export function useApproval(id: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["approvals", id],
    queryFn: () => api.get<Approval>(`/approvals/${id}`),
    enabled: !!id,
  });
}

function useDecideApproval(action: "approve" | "reject") {
  const api = useApiClient();
  const queryClient = useQueryClient();

  // No optimistic update: the query cache's real shape is the raw API
  // envelope ({ approvals: Approval[] } for the list queries, a bare
  // Approval for the ["approvals", id] detail query) — a naive
  // old?.filter(...) updater across every "approvals"-prefixed query
  // (a real bug caught live 2026-08-30) breaks the moment it hits the
  // detail query's plain object. Matches useRuns.ts's useCancelRun, which
  // also just invalidates on success rather than attempting this.
  return useMutation<{ approval_id: string; decision: string }, ApiError, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) => api.post(`/approvals/${id}/${action}`, action === "reject" ? { reason } : {}),
    onSuccess: () => {
      toast.success(action === "approve" ? "Approved" : "Rejected");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
    onError: (err) => {
      toast.error(action === "approve" ? "Could not approve" : "Could not reject", { description: err.message });
    },
  });
}

export function useApproveApproval() {
  return useDecideApproval("approve");
}

export function useRejectApproval() {
  return useDecideApproval("reject");
}
