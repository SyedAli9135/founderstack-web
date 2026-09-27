"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";
import { PlanTier, Subscription, UpgradeResponse } from "@/lib/api/types";

export const subscriptionKey = ["billing", "subscription"] as const;

export function useSubscription() {
  const api = useApiClient();
  return useQuery({
    queryKey: subscriptionKey,
    queryFn: () => api.get<Subscription>("/billing/subscription"),
    // The past-due banner reads this on every page; a minute is plenty
    // fresh for something Stripe itself retries over days.
    staleTime: 60_000,
  });
}

// Either returns a Stripe Checkout URL to send the browser to, or — when
// the org already has a live subscription — the plan was changed in
// place and the new subscription comes back directly.
export function useUpgradePlan() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tier: PlanTier) => api.post<UpgradeResponse>("/billing/subscription/upgrade", { tier }),
    onSuccess: (res) => {
      if (res.subscription) qc.setQueryData(subscriptionKey, res.subscription);
    },
  });
}

// A query, not a mutation, keyed by the Checkout session: confirming is
// idempotent server-side, and a query survives React's dev-mode double
// mount, where a mutate() fired from an effect loses its per-call callbacks
// and leaves the page stuck on "Confirming…".
export function useConfirmCheckout(sessionId: string | null) {
  const api = useApiClient();
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["billing", "confirm", sessionId],
    queryFn: async () => {
      const sub = await api.post<Subscription>("/billing/subscription/confirm", { session_id: sessionId });
      qc.setQueryData(subscriptionKey, sub);
      return sub;
    },
    enabled: !!sessionId,
    retry: false,
    staleTime: Infinity,
  });
}

export function useBillingPortal() {
  const api = useApiClient();
  return useMutation({
    mutationFn: () => api.post<{ url: string }>("/billing/portal", {}),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}
