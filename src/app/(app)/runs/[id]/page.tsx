"use client";

import { use, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRun, useCancelRun } from "@/hooks/useRuns";
import { useWorkflowStream } from "@/hooks/useWorkflowStream";
import { AgentPipeline } from "@/components/workflows/AgentPipeline";
import { LiveFeed } from "@/components/workflows/LiveFeed";
import { Button } from "@/components/ui/button";
import { RunStatus } from "@/lib/api/types";
import { Loader2, ArrowLeft, Ban, Wifi, WifiOff } from "lucide-react";

const LIVE_STATUSES: RunStatus[] = ["pending", "running", "awaiting_approval"];

const statusMeta: Record<RunStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  running: { label: "Running", className: "bg-primary/15 text-primary" },
  awaiting_approval: { label: "Awaiting approval", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  completed: { label: "Completed", className: "bg-primary/15 text-primary" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

function StatusBadge({ status }: { status: RunStatus }) {
  const meta = statusMeta[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function formatDuration(ms?: number): string | null {
  if (!ms && ms !== 0) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: run, isLoading, error } = useRun(id);
  const cancelMutation = useCancelRun();
  const queryClient = useQueryClient();

  const isLive = run ? LIVE_STATUSES.includes(run.status) : false;
  const { events, connectionState } = useWorkflowStream(isLive ? id : null);

  // The SSE stream's own `complete`/`error` events carry only the raw
  // output/error text, not the full persisted summary (tokens, cost,
  // duration) — refetch the REST detail once the run reaches a terminal
  // state so the summary panel below reflects what Launcher actually
  // finalized, not a stale pre-run snapshot.
  const lastEventType = events.length > 0 ? events[events.length - 1].type : null;
  useEffect(() => {
    if (lastEventType === "complete" || lastEventType === "error") {
      queryClient.invalidateQueries({ queryKey: ["runs", id] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEventType, id]);

  const cost = useMemo(() => (run ? `$${run.cost_so_far_usd.toFixed(4)}` : null), [run]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-destructive">Could not load this run</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "Run not found"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="border-b border-border pb-6">
        <Link
          href="/runs"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          All runs
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">Run</h1>
            <StatusBadge status={run.status} />
            {isLive && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {connectionState === "open" ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {connectionState === "connecting" && "Connecting…"}
                {connectionState === "open" && "Live"}
                {connectionState === "error" && "Connection lost"}
                {connectionState === "closed" && "Stream ended"}
              </span>
            )}
          </div>
          {isLive && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => cancelMutation.mutate(id)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <Ban className="mr-1.5 h-3 w-3" />
              )}
              Cancel
            </Button>
          )}
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{run.id}</p>
      </div>

      <AgentPipeline events={events} />

      <div>
        <h2 className="mb-2 text-sm font-medium text-foreground">Activity</h2>
        <LiveFeed events={events} />
      </div>

      {run.output && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-foreground">Output</h2>
          <div className="rounded-lg border border-border bg-card p-4 text-sm whitespace-pre-wrap text-foreground">
            {run.output}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
        <Stat label="Cost so far" value={cost ?? "—"} />
        <Stat label="Tool calls" value={String(run.tool_call_count)} />
        <Stat label="Tokens (in / out)" value={`${run.input_tokens} / ${run.output_tokens}`} />
        <Stat label="Duration" value={formatDuration(run.duration_ms) ?? "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
