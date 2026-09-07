"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";
import { AgentPerformanceItem, RagQualityStats } from "@/lib/api/types";

interface HoursSaved {
  total_hours_saved: number;
  this_month_hours_saved: number;
  this_week_hours_saved: number;
  equivalent_salary_usd: number;
}

// Built in workflow 11, never consumed by any page until now — the
// dashboard's hero metric.
export function useHoursSaved() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["analytics", "hours-saved"],
    queryFn: () => api.get<HoursSaved>("/analytics/hours-saved"),
  });
}

export function useAgentPerformance() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["analytics", "agent-performance"],
    queryFn: () => api.get<AgentPerformanceItem[]>("/analytics/agent-performance"),
  });
}

export function useRagQuality() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["analytics", "rag-quality"],
    queryFn: () => api.get<RagQualityStats>("/analytics/rag-quality"),
  });
}
