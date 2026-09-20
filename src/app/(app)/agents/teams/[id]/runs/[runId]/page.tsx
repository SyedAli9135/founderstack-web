"use client";

import { use, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTeamRunTrace } from "@/hooks/useAgentTeams";
import { useCancelRun, useRunSteps } from "@/hooks/useRuns";
import { useWorkflowStream } from "@/hooks/useWorkflowStream";
import { MultiAgentPipeline } from "@/components/workflows/MultiAgentPipeline";
import { LiveFeed } from "@/components/workflows/LiveFeed";
import { RunTimeline } from "@/components/workflows/RunTimeline";
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

// Workflow 18's team-run counterpart to runs/[id]/page.tsx — same live-SSE
// shape (the orchestrator's run_id is an ordinary workflow_runs row, so
// GET /runs/{id}/stream is the identical endpoint), swapping AgentPipeline
// for MultiAgentPipeline and the single-run REST detail for
// GET /teams/{id}/runs/{run_id}'s aggregated trace (orchestrator summary +
// every specialist it dispatched).
export default function TeamRunDetailPage({ params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id: teamId, runId } = use(params);
  const { data: trace, isLoading, error } = useTeamRunTrace(teamId, runId);
  const cancelMutation = useCancelRun();
  const queryClient = useQueryClient();
  const { data: orchestratorSteps, isLoading: stepsLoading } = useRunSteps(runId);

  const isLive = trace ? LIVE_STATUSES.includes(trace.status) : false;
  const { events, connectionState } = useWorkflowStream(isLive ? runId : null);

  // Same staleness fix as the single-agent run page: the SSE stream's own
  // complete/error events don't carry the full persisted summary (or, for
  // a team run, any specialist's own final state) — refetch the
  // aggregated trace once the run reaches a terminal state or a subtask is
  // first delegated, so the specialist lanes and their REST-derived
  // statuses stay current rather than stuck at whatever existed at
  // page-load time.
  const lastEventType = events.length > 0 ? events[events.length - 1].type : null;
  useEffect(() => {
    if (lastEventType === "complete" || lastEventType === "error" || lastEventType === "delegated") {
      queryClient.invalidateQueries({ queryKey: ["agent-teams", teamId, "runs", runId] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEventType, teamId, runId]);

  const totalCostUSD = useMemo(() => {
    if (!trace) return null;
    const specialistsCost = trace.specialists.reduce((sum, s) => sum + s.cost_so_far_usd, 0);
    return trace.cost_so_far_usd + specialistsCost;
  }, [trace]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !trace) {
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
          href={`/agents/teams/${teamId}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Team
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">Team run</h1>
            <StatusBadge status={trace.status} />
            {isLive && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {connectionState === "open" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
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
              onClick={() =>
                cancelMutation.mutate(runId, {
                  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agent-teams", teamId, "runs", runId] }),
                })
              }
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
        <p className="mt-1 font-mono text-xs text-muted-foreground">{trace.id}</p>
      </div>

      <MultiAgentPipeline
        events={events}
        finalStatus={trace.status}
        finalNode={trace.current_node}
        specialists={trace.specialists}
      />

      <div>
        <h2 className="mb-2 text-sm font-medium text-foreground">Activity</h2>
        <LiveFeed events={events} isLive={isLive} />
      </div>

      {trace.output && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-foreground">Output</h2>
          <div className="rounded-lg border border-border bg-card p-4 text-sm whitespace-pre-wrap text-foreground">
            {trace.output}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-foreground">Orchestrator trace</h2>
        <RunTimeline steps={orchestratorSteps} isLoading={stepsLoading} />
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
        <Stat label="Total cost" value={totalCostUSD !== null ? `$${totalCostUSD.toFixed(4)}` : "—"} />
        <Stat label="Specialists dispatched" value={String(trace.specialists.length)} />
        <Stat label="Orchestrator cost" value={`$${trace.cost_so_far_usd.toFixed(4)}`} />
        <Stat label="Duration" value={formatDuration(trace.duration_ms) ?? "—"} />
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
