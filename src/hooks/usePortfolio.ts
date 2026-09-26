"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApiClient, ApiError } from "@/lib/api/client";
import { ClientWorkspace, PortfolioSummary, PracticeInfo, WorkspaceRef } from "@/lib/api/types";
import { toast } from "sonner";

// Works even when the session's active org is unusable (the endpoint needs
// only a verified identity) — OnboardingShield relies on that to recover.
export function useMyWorkspaces(options: { enabled?: boolean } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspaces", "mine"],
    queryFn: () => api.get<{ workspaces: WorkspaceRef[] }>("/me/workspaces"),
    select: (res) => res.workspaces,
    enabled: options.enabled ?? true,
  });
}

export function useClientWorkspaces() {
  const api = useApiClient();
  return useQuery<{ practice: PracticeInfo; workspaces: ClientWorkspace[] }, ApiError>({
    queryKey: ["practice", "client-workspaces"],
    queryFn: () => api.get("/practice/client-workspaces"),
  });
}

export function usePortfolioSummary() {
  const api = useApiClient();
  return useQuery<PortfolioSummary, ApiError>({
    queryKey: ["practice", "summary"],
    queryFn: () => api.get("/practice/portfolio-summary"),
    refetchInterval: 30000,
  });
}

function useInvalidatePortfolio() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["practice"] });
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };
}

export function useCreateClientWorkspace() {
  const api = useApiClient();
  const invalidate = useInvalidatePortfolio();
  return useMutation<ClientWorkspace, ApiError, { name: string; client_contact_email?: string }>({
    mutationFn: (body) => api.post("/practice/client-workspaces", body),
    onSuccess: invalidate,
  });
}

export function useRemoveClientWorkspace() {
  const api = useApiClient();
  const invalidate = useInvalidatePortfolio();
  return useMutation<unknown, ApiError, ClientWorkspace>({
    mutationFn: (ws) => api.delete(`/practice/client-workspaces/${ws.id}`),
    onSuccess: (_, ws) => {
      invalidate();
      toast.success(`${ws.name} deactivated`, { description: "Data is retained for 30 days." });
    },
    onError: (err) => toast.error("Could not remove workspace", { description: err.message }),
  });
}

export function useRestoreClientWorkspace() {
  const api = useApiClient();
  const invalidate = useInvalidatePortfolio();
  return useMutation<unknown, ApiError, ClientWorkspace>({
    mutationFn: (ws) => api.post(`/practice/client-workspaces/${ws.id}/restore`, {}),
    onSuccess: (_, ws) => {
      invalidate();
      toast.success(`${ws.name} restored`);
    },
    onError: (err) => toast.error("Could not restore workspace", { description: err.message }),
  });
}

// Switching is Clerk's setActive: the backend reads the active org straight
// from the session token, so there's no app-side "current workspace" state
// to keep in sync. Cached data from the previous workspace is dropped by
// ResetQueriesOnOrgSwitch (providers.tsx), not here, so a switch made
// anywhere (Clerk's own UI, another tab) gets the same treatment.
export function useSwitchWorkspace() {
  const { setActive } = useClerk();
  const router = useRouter();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const switchTo = async (clerkOrgId: string, redirectTo = "/dashboard") => {
    setSwitchingTo(clerkOrgId);
    try {
      await setActive({ organization: clerkOrgId });
      // Always leave the current page: an id-scoped route (/runs/<id>) from
      // the old workspace would just 404 in the new one.
      router.push(redirectTo);
    } catch (err) {
      toast.error("Could not switch workspace", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSwitchingTo(null);
    }
  };

  return { switchTo, switchingTo };
}
