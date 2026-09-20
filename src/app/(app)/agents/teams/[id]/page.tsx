"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAgentTeam, useRunAgentTeam, useTeamRuns } from "@/hooks/useAgentTeams";
import { usePermissions } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { RunStatus } from "@/lib/api/types";
import { ArrowLeft, ChevronRight, History, Loader2, Network, Play, Sparkles } from "lucide-react";

const statusMeta: Record<RunStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  running: { label: "Running", className: "bg-primary/15 text-primary" },
  awaiting_approval: { label: "Awaiting approval", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  completed: { label: "Completed", className: "bg-primary/15 text-primary" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

function formatRunTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AgentTeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: team, isLoading, error } = useAgentTeam(id);
  const { data: runs, isLoading: runsLoading } = useTeamRuns(id);
  const { canTriggerWorkflows } = usePermissions();
  const runMutation = useRunAgentTeam();

  const [input, setInput] = useState("");
  const [runError, setRunError] = useState<string | null>(null);

  const handleRun = () => {
    setRunError(null);
    if (!input.trim()) {
      setRunError("Describe the task for this team to work on");
      return;
    }
    runMutation.mutate(
      { id, input: input.trim() },
      {
        onSuccess: (data) => router.push(`/agents/teams/${id}/runs/${data.run_id}`),
        onError: (err) => setRunError(err.message),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-destructive">Could not load this team</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "Team not found"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="border-b border-border pb-6">
        <Link
          href="/agents/teams"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          All teams
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-foreground">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{team.name}</h1>
            {team.description && <p className="mt-0.5 text-sm text-muted-foreground">{team.description}</p>}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-foreground">Orchestrator</h2>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">{team.orchestrator_agent_name}</span>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-foreground">Specialists</h2>
        <div className="space-y-2">
          {team.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{member.agent_name}</p>
                {member.agent_description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{member.agent_description}</p>
                )}
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          Recent runs
        </h2>
        {runsLoading ? (
          <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-border">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : !runs || runs.length === 0 ? (
          <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No runs yet — trigger one below.
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/agents/teams/${id}/runs/${run.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta[run.status].className}`}
                  >
                    {statusMeta[run.status].label}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatRunTime(run.created_at)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">${run.cost_so_far_usd.toFixed(4)}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {canTriggerWorkflows && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <label htmlFor="team-run-input" className="block text-xs font-medium text-muted-foreground">
            What should this team work on?
          </label>
          <textarea
            id="team-run-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="Prepare a Q2 board meeting summary covering burn rate and hiring plan"
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          {runError && <p className="text-xs text-destructive">{runError}</p>}
          <div className="flex justify-end">
            <Button onClick={handleRun} disabled={runMutation.isPending}>
              {runMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-3.5 w-3.5" />
              )}
              Run team
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
