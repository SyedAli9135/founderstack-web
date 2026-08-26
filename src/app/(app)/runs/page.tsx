"use client";

import { useState } from "react";
import Link from "next/link";
import { useRuns } from "@/hooks/useRuns";
import { RunStatus } from "@/lib/api/types";
import { History, Loader2 } from "lucide-react";

const TABS: { label: string; status?: RunStatus }[] = [
  { label: "All" },
  { label: "Running", status: "running" },
  { label: "Awaiting approval", status: "awaiting_approval" },
  { label: "Completed", status: "completed" },
  { label: "Failed", status: "failed" },
];

const statusDot: Record<RunStatus, string> = {
  pending: "bg-muted-foreground/50",
  running: "bg-primary animate-pulse",
  awaiting_approval: "bg-amber-500",
  completed: "bg-primary",
  failed: "bg-destructive",
  cancelled: "bg-muted-foreground/50",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RunsPage() {
  const [tab, setTab] = useState(0);
  const { data: runs, isLoading, error } = useRuns({ status: TABS[tab].status });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="border-b border-border pb-6">
        <h1 className="text-xl font-semibold tracking-tight">Runs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every time an agent has run, whether triggered manually or on a schedule.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setTab(i)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === i
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-medium text-destructive">Could not load runs</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      ) : !runs || runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <History className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No runs here yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Trigger a workflow from the Workflows page to see it appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Cost</th>
                <th className="px-4 py-2 font-medium">Started</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-accent/40">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[run.status]}`} />
                      <span className="capitalize text-foreground">{run.status.replace("_", " ")}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">${run.cost_so_far_usd.toFixed(4)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {run.started_at ? formatWhen(run.started_at) : formatWhen(run.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/runs/${run.id}`} className="text-xs font-medium text-primary hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
