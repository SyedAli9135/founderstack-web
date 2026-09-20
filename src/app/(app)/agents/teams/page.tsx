"use client";

import { useState } from "react";
import Link from "next/link";
import { useAgentTeams, useDeleteAgentTeam } from "@/hooks/useAgentTeams";
import { usePermissions } from "@/hooks/useTeam";
import { AgentTeamSummary } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Network, Loader2, Plus, Trash2, Users } from "lucide-react";

function TeamCard({ team, canModify }: { team: AgentTeamSummary; canModify: boolean }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useDeleteAgentTeam();

  return (
    <div className="flex min-h-[176px] flex-col justify-between rounded-lg border border-border bg-card p-4">
      <Link href={`/agents/teams/${team.id}`} className="block">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-foreground">
            <Network className="h-4 w-4" />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <Users className="h-3 w-3" />
            {team.member_count ?? 0} {team.member_count === 1 ? "member" : "members"}
          </span>
        </div>
        <h4 className="text-sm font-medium text-foreground">{team.name}</h4>
        <p className="mt-1 text-xs text-muted-foreground">Orchestrator: {team.orchestrator_agent_name}</p>
        {team.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{team.description}</p>
        )}
      </Link>

      {canModify && (
        <div className="mt-4">
          {confirmingDelete ? (
            <div className="flex justify-end gap-2">
              <Button size="xs" variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button
                size="xs"
                variant="destructive"
                onClick={() => deleteMutation.mutate(team.id, { onSuccess: () => setConfirmingDelete(false) })}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-end">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Delete"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Workflow 18: agent teams (orchestrator + specialists dispatched via
// A2A), distinct from /settings/team's org-membership "team" (workflow
// 13) — see this page's own layout.tsx nav entry comment.
export default function AgentTeamsPage() {
  const { data: teams, isLoading, error } = useAgentTeams();
  const { canModifyAgents } = usePermissions();

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
        <p className="text-sm font-medium text-destructive">Could not load agent teams</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const items = teams ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agent teams</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            An orchestrator splits a complex task across specialist agents that run in parallel,
            then synthesizes their results into one answer.
          </p>
        </div>
        {canModifyAgents && (
          <Link href="/agents/teams/new">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              New team
            </Button>
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <Network className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No agent teams yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Pick an orchestrator agent, then add the specialists it can delegate to.
          </p>
          {canModifyAgents && (
            <Link href="/agents/teams/new">
              <Button size="sm" variant="outline" className="mt-2">
                New team
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((team) => (
            <TeamCard key={team.id} team={team} canModify={canModifyAgents} />
          ))}
        </div>
      )}
    </div>
  );
}
