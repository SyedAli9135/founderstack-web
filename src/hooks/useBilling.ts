"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";
import { BillingUsage, LedgerResponse } from "@/lib/api/types";

export function useBillingUsage() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["billing", "usage"],
    queryFn: () => api.get<BillingUsage>("/billing/usage"),
  });
}

export function useCostLedger(limit = 50) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["billing", "ledger", limit],
    queryFn: () => api.get<LedgerResponse>(`/billing/ledger?limit=${limit}`),
  });
}
