"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";
import { ClientReport, ReportInput } from "@/lib/api/types";
import { toast } from "sonner";

export function useReports() {
  const api = useApiClient();
  return useQuery<{ reports: ClientReport[] }, ApiError>({
    queryKey: ["reports"],
    queryFn: () => api.get("/reports"),
  });
}

export function useReport(id: string) {
  const api = useApiClient();
  return useQuery<ClientReport, ApiError>({
    queryKey: ["reports", id],
    queryFn: () => api.get(`/reports/${id}`),
  });
}

export function useCreateReport() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<ClientReport, ApiError, ReportInput>({
    mutationFn: (input) => api.post("/reports", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useRevokeReport() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, ClientReport>({
    mutationFn: (r) => api.delete(`/reports/${r.id}`),
    onSuccess: (_, r) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Link revoked", { description: `${r.title} is no longer viewable.` });
    },
    onError: (err) => toast.error("Could not revoke", { description: err.message }),
  });
}

export function shareUrl(r: Pick<ClientReport, "share_path">): string {
  return typeof window === "undefined" ? r.share_path : `${window.location.origin}${r.share_path}`;
}

// Clipboard can be unavailable (insecure origin, denied permission); fall
// back to a hidden textarea so "Copy link" still works on plain http dev.
export async function copyShareLink(r: ClientReport) {
  const url = shareUrl(r);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast.success("Link copied", {
    description: `Valid until ${new Date(r.expires_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`,
  });
}
