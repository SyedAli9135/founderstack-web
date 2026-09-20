"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AgentPipeline, TEAM_ORCHESTRATOR_NODES } from "./AgentPipeline";
import { RunTimeline } from "./RunTimeline";
import { useRunSteps } from "@/hooks/useRuns";
import { RunEvent, RunStatus, TeamChildRun } from "@/lib/api/types";

interface SpecialistLane {
  subRunId: string;
  role?: string;
  agentName?: string;
  status?: RunStatus;
  currentNode?: string;
}

/** Workflow 18's multi-agent layout: the orchestrator's own 4-node
 * pipeline (planner -> delegate -> validator -> reporter) on top, then
 * one lane per specialist below, running in parallel — the visual shape
 * WORKFLOW_PLAN_GO.md's own acceptance criteria describe.
 *
 * `events` is the *single* unified SSE stream the orchestrator's own
 * run_id already carries (see useWorkflowStream(runId)) — a specialist's
 * events arrive mirrored onto it (graph.EventBus.LinkChild), tagged with
 * `sub_run_id`/`agent_role`, never as a second stream connection. This
 * component only ever needs one `useWorkflowStream` call from its caller.
 *
 * `specialists` (from GET /teams/{id}/runs/{run_id}, workflow 18's
 * aggregated-trace endpoint) backfills a lane for a specialist whose live
 * events never arrived — already finished before the page connected, the
 * same reason AgentPipeline itself needs finalStatus/finalNode for the
 * single-agent case. */
export function MultiAgentPipeline({
  events,
  finalStatus,
  finalNode,
  specialists,
}: {
  events: RunEvent[];
  finalStatus?: RunStatus;
  finalNode?: string;
  specialists?: TeamChildRun[];
}) {
  const orchestratorEvents = useMemo(() => events.filter((ev) => !ev.sub_run_id), [events]);

  const lanes = useMemo(() => {
    const byId = new Map<string, SpecialistLane>();
    for (const s of specialists ?? []) {
      byId.set(s.id, { subRunId: s.id, role: s.role, agentName: s.agent_name, status: s.status, currentNode: s.current_node });
    }
    // Live events can introduce a lane the REST trace hasn't caught up to
    // yet (e.g. the trace was fetched right as delegation started) — union
    // both sources rather than trusting either alone.
    for (const ev of events) {
      if (!ev.sub_run_id) continue;
      const existing = byId.get(ev.sub_run_id);
      if (existing) {
        if (!existing.role && ev.agent_role) existing.role = ev.agent_role;
        continue;
      }
      byId.set(ev.sub_run_id, { subRunId: ev.sub_run_id, role: ev.agent_role });
    }
    return Array.from(byId.values());
  }, [events, specialists]);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Orchestrator</p>
        <AgentPipeline
          events={orchestratorEvents}
          finalStatus={finalStatus}
          finalNode={finalNode}
          nodes={TEAM_ORCHESTRATOR_NODES}
        />
      </div>

      {lanes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Specialists <span className="text-muted-foreground/60">— running in parallel</span>
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {lanes.map((lane) => (
              <SpecialistLaneCard
                key={lane.subRunId}
                lane={lane}
                events={events.filter((ev) => ev.sub_run_id === lane.subRunId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SpecialistLaneCard({ lane, events }: { lane: SpecialistLane; events: RunEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  // Only fetched once expanded — a team run with several specialists
  // shouldn't fire N steps requests the founder never looks at.
  const { data: steps, isLoading } = useRunSteps(expanded ? lane.subRunId : null);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-baseline gap-1.5">
        <p className="text-sm font-medium text-foreground">{lane.agentName ?? "Specialist"}</p>
        {lane.role && <span className="text-xs text-muted-foreground">({lane.role})</span>}
      </div>
      <AgentPipeline events={events} finalStatus={lane.status} finalNode={lane.currentNode} />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {expanded ? "Hide steps" : "Show steps"}
      </button>
      {expanded && (
        <div className="mt-2">
          <RunTimeline steps={steps} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
