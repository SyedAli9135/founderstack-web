"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { useAgentPerformance } from "@/hooks/useAnalytics";
import { AgentPerformanceItem } from "@/lib/api/types";

type SortKey = "success_rate" | "avg_duration_ms" | "avg_cost_usd" | "total_runs";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "total_runs", label: "Total runs" },
  { key: "success_rate", label: "Success rate" },
  { key: "avg_duration_ms", label: "Avg duration" },
  { key: "avg_cost_usd", label: "Avg cost" },
];

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatUSD(n: number): string {
  return `$${n.toFixed(4)}`;
}

function SuccessRateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${rate * 100}%` }} />
      </div>
      <span className="tabular-nums text-muted-foreground">{(rate * 100).toFixed(0)}%</span>
    </div>
  );
}

export default function AgentPerformancePage() {
  const { data, isLoading, error } = useAgentPerformance();
  const [sortKey, setSortKey] = useState<SortKey>("total_runs");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    const items = [...(data ?? [])];
    items.sort((a, b) => (sortDesc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
    return items;
  }, [data, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-destructive">Could not load agent performance</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Agent performance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Which agents are working well, and which are worth a closer look.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground">No runs yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Once a workflow has run at least once, its agent shows up here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Agent</th>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-5 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {col.label}
                      {sortKey === col.key &&
                        (sortDesc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item: AgentPerformanceItem) => (
                <tr key={item.agent_id} className="border-b border-border text-sm last:border-0">
                  <td className="px-5 py-3 font-medium text-foreground">{item.agent_name}</td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">{item.total_runs}</td>
                  <td className="px-5 py-3">
                    <SuccessRateBar rate={item.success_rate} />
                  </td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">
                    {formatDuration(item.avg_duration_ms)}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">{formatUSD(item.avg_cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
