"use client";

import { useMemo } from "react";
import { Brain, Wrench, ShieldCheck, FileCheck, UserCheck, Loader2, Check, X, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RunEvent, RunNodeName, RunStatus } from "@/lib/api/types";

type NodeStatus = "pending" | "active" | "completed" | "failed";

export interface PipelineNode {
  name: string;
  label: string;
  icon: LucideIcon;
}

// The 4 nodes graph.BuildNodes always runs, in order — matches what's
// actually built today, not the original plan's aspirational 6-node list
// (a rag_retriever step doesn't exist yet; see WORKFLOW_PLAN_GO.md).
export const PIPELINE_NODES: { name: RunNodeName; label: string; icon: LucideIcon }[] = [
  { name: "planner", label: "Planner", icon: Brain },
  { name: "executor", label: "Executor", icon: Wrench },
  { name: "validator", label: "Validator", icon: ShieldCheck },
  { name: "reporter", label: "Reporter", icon: FileCheck },
];

// Workflow 18: the orchestrator's own graph (BuildTeamNodes) swaps
// "executor" for "delegate" — everything else is identical. A specialist's
// own sub-run still uses the ordinary PIPELINE_NODES above unchanged
// (BuildNodes, not BuildTeamNodes), since a specialist agent is a normal
// single-agent run.
export const TEAM_ORCHESTRATOR_NODES: PipelineNode[] = [
  { name: "planner", label: "Planner", icon: Brain },
  { name: "delegate", label: "Delegate", icon: Share2 },
  { name: "validator", label: "Validator", icon: ShieldCheck },
  { name: "reporter", label: "Reporter", icon: FileCheck },
];

function deriveNodeStatuses(events: RunEvent[]): {
  statuses: Record<string, NodeStatus>;
  awaitingApproval: boolean;
} {
  const statuses: Record<string, NodeStatus> = {};
  let activeNode: string | null = null;
  let awaitingApproval = false;

  for (const ev of events) {
    if (ev.type === "node_start" && ev.data && typeof ev.data === "object" && "node" in ev.data) {
      const node = ev.data.node;
      statuses[node] = "active";
      activeNode = node;
      if (node !== "approval_gate") awaitingApproval = false;
    } else if (ev.type === "node_end" && ev.data && typeof ev.data === "object" && "node" in ev.data) {
      const node = ev.data.node;
      statuses[node] = "completed";
      if (activeNode === node) activeNode = null;
    } else if (ev.type === "approval_required") {
      awaitingApproval = true;
      statuses["approval_gate"] = "active";
    } else if (ev.type === "error" && activeNode) {
      statuses[activeNode] = "failed";
      activeNode = null;
    }
  }

  return { statuses, awaitingApproval };
}

/** Fills in nodes the live SSE stream never reported — e.g. the page
 * mounted after the run (or its early nodes) already finished, since
 * Engine.Bus doesn't replay past events to a late subscriber. Derived
 * from the run's REST-persisted final `status`/`current_node`, so it's
 * necessarily coarser than the live per-node timeline: a `completed` run
 * must have passed through all 4 nodes (the pipeline is strictly
 * sequential), so that case is exact. A `failed`/`cancelled` run only
 * tells us the *last* node the checkpoint recorded — nodes strictly
 * before it get marked completed, that node itself gets marked failed,
 * nodes after stay pending (we don't know they never started vs. just
 * weren't reached — pending is the honest answer either way). Never
 * overrides a status the live stream actually reported.
 */
function backfillFromFinalStatus(nodeOrder: string[], finalStatus?: RunStatus, finalNode?: string): Record<string, NodeStatus> {
  const backfill: Record<string, NodeStatus> = {};
  if (finalStatus === "completed") {
    for (const node of nodeOrder) backfill[node] = "completed";
    return backfill;
  }
  if (finalStatus === "failed" || finalStatus === "cancelled") {
    // approval_gate isn't one of the visualized nodes (and doesn't exist
    // at all on the team-orchestrator graph — see TEAM_ORCHESTRATOR_NODES)
    // — a single-agent run that stopped there got all the way past
    // executor, i.e. as far as "validator" in nodeOrder.
    const stopIndex = finalNode === "approval_gate" ? nodeOrder.indexOf("validator") : finalNode ? nodeOrder.indexOf(finalNode) : -1;
    if (stopIndex === -1) return backfill;
    nodeOrder.forEach((node, i) => {
      if (i < stopIndex) backfill[node] = "completed";
      else if (i === stopIndex) backfill[node] = "failed";
    });
  }
  return backfill;
}

/** Row of node-state cards — pulses the active node, checks off completed
 * ones, flags a failure. See WORKFLOW_PLAN_GO.md's Workflow 9 acceptance
 * criteria ("show which agent node is currently active... so the founder
 * knows the system hasn't hung"). `nodes` defaults to the single-agent
 * PIPELINE_NODES — workflow 18's multi-agent pipeline passes
 * TEAM_ORCHESTRATOR_NODES for the orchestrator's own lane, and reuses the
 * default for each specialist lane (a specialist is an ordinary
 * single-agent run). */
export function AgentPipeline({
  events,
  finalStatus,
  finalNode,
  nodes = PIPELINE_NODES,
}: {
  events: RunEvent[];
  finalStatus?: RunStatus;
  finalNode?: string;
  nodes?: PipelineNode[];
}) {
  const nodeOrder = useMemo(() => nodes.map((n) => n.name), [nodes]);
  const { statuses: liveStatuses, awaitingApproval } = useMemo(() => deriveNodeStatuses(events), [events]);
  const backfill = useMemo(() => backfillFromFinalStatus(nodeOrder, finalStatus, finalNode), [nodeOrder, finalStatus, finalNode]);
  // Live-derived status always wins where we have it; backfill only fills
  // in nodes the stream never reported anything for.
  const statuses = useMemo(() => ({ ...backfill, ...liveStatuses }), [backfill, liveStatuses]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {nodes.map((node) => (
          <NodeCard key={node.name} label={node.label} Icon={node.icon} status={statuses[node.name] ?? "pending"} />
        ))}
      </div>

      {awaitingApproval && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Waiting on approval</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This run wants to take an action that always requires a human decision — decide
              below.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function NodeCard({ label, Icon, status }: { label: string; Icon: LucideIcon; status: NodeStatus }) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors ${
        status === "active"
          ? "border-primary/40 bg-primary/5"
          : status === "failed"
            ? "border-destructive/40 bg-destructive/5"
            : "border-border bg-card"
      }`}
    >
      <div
        className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
          status === "completed"
            ? "bg-primary text-primary-foreground"
            : status === "failed"
              ? "bg-destructive text-destructive-foreground"
              : status === "active"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
        }`}
      >
        {status === "active" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "completed" ? (
          <Check className="h-4 w-4" />
        ) : status === "failed" ? (
          <X className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <span
        className={`text-xs font-medium ${status === "pending" ? "text-muted-foreground" : "text-foreground"}`}
      >
        {label}
      </span>
    </div>
  );
}
