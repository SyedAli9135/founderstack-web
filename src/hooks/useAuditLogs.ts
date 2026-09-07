"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";
import { AuditLogCursor, AuditLogsResponse } from "@/lib/api/types";

export interface AuditLogFilters {
  actorType?: string;
  action?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Cursor-based "Load more" pagination — the first place in this app that
// reaches for useInfiniteQuery rather than plain limit/offset (see
// useBilling.ts's useCostLedger), since audit_logs is written to
// continuously and a plain offset page would skip or repeat rows as new
// entries land between fetches.
export function useAuditLogs(filters: AuditLogFilters) {
  const api = useApiClient();
  return useInfiniteQuery({
    queryKey: ["audit-logs", filters],
    queryFn: ({ pageParam }) => {
      // URLSearchParams percent-encodes correctly — a plain string
      // concatenation of an RFC3339 cursor's '+' timezone offset gets
      // silently decoded as a space server-side otherwise (a real bug
      // this app's own backend test caught while building this endpoint).
      const params = new URLSearchParams();
      if (filters.actorType) params.set("actor_type", filters.actorType);
      if (filters.action) params.set("action", filters.action);
      if (filters.status) params.set("status", filters.status);
      if (filters.dateFrom) params.set("date_from", filters.dateFrom);
      if (filters.dateTo) params.set("date_to", filters.dateTo);
      if (pageParam) {
        params.set("cursor_created_at", pageParam.created_at);
        params.set("cursor_id", pageParam.id);
      }
      return api.get<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
    },
    initialPageParam: null as AuditLogCursor | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}
