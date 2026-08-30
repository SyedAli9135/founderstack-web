"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";

interface ApprovalSettings {
  slack_channel_id: string | null;
}

export function useApprovalSettings() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["settings", "approvals"],
    queryFn: () => api.get<ApprovalSettings>("/settings/approvals"),
  });
}

export function useUpdateApprovalSettings() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<ApprovalSettings, ApiError, string>({
    mutationFn: (slackChannelId) => api.put<ApprovalSettings>("/settings/approvals", { slack_channel_id: slackChannelId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "approvals"] });
    },
  });
}
