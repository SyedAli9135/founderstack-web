"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";
import { AgentTeamDetail, AgentTeamSummary, CreateAgentTeamInput, RunStatus, TeamRunSummary, TeamRunTrace } from "@/lib/api/types";
import { toast } from "sonner";

// Same non-terminal set the team run page uses to decide whether to attach
// an SSE stream at all.
const LIVE_STATUSES: RunStatus[] = ["pending", "running", "awaiting_approval"];

// Workflow 18. Named useAgentTeams (not useTeam/useTeams) to stay clear of
// workflow 13's useTeam.ts, which is org membership/roles — a completely
// different "team" concept from this one's agent_teams.

export function useAgentTeams() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["agent-teams"],
    queryFn: () => api.get<AgentTeamSummary[]>("/teams"),
  });
}

export function useAgentTeam(id: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["agent-teams", id],
    queryFn: () => api.get<AgentTeamDetail>(`/teams/${id}`),
    enabled: !!id,
  });
}

export function useCreateAgentTeam() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<AgentTeamSummary, ApiError, CreateAgentTeamInput>({
    mutationFn: (input) => api.post<AgentTeamSummary>("/teams", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-teams"] });
    },
    onError: (err) => {
      toast.error("Could not create team", { description: err.message });
    },
  });
}

export function useDeleteAgentTeam() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-teams"] });
      toast.success("Team deleted");
    },
    onError: (err) => {
      toast.error("Could not delete team", { description: err.message });
    },
  });
}

export function useRunAgentTeam() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<{ run_id: string; status: string; stream_url: string }, ApiError, { id: string; input: string }>({
    mutationFn: ({ id, input }) =>
      api.post<{ run_id: string; status: string; stream_url: string }>(`/teams/${id}/run`, { input }),
    onSuccess: (_, { id }) => {
      // So the new run appears in "Recent runs" immediately if the
      // founder navigates back to the team page, not just after a poll.
      queryClient.invalidateQueries({ queryKey: ["agent-teams", id, "runs"] });
    },
    onError: (err) => {
      toast.error("Could not start team run", { description: err.message });
    },
  });
}

export function useTeamRunTrace(teamId: string | null, runId: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["agent-teams", teamId, "runs", runId],
    queryFn: () => api.get<TeamRunTrace>(`/teams/${teamId}/runs/${runId}`),
    enabled: !!teamId && !!runId,
    // Bounded polling fallback, not the primary update path — the run
    // page's own SSE-driven invalidateQueries (on complete/error/
    // delegated) is what makes the UI feel live, and fires far sooner
    // than this. This exists purely so the page can't get stuck showing
    // a stale non-terminal status forever if that SSE-driven refetch
    // never fires for any reason (a missed frame, a reconnect, a
    // backgrounded tab) — a real gap found 2026-09-20: the backend had
    // actually completed correctly in Postgres, but the page kept
    // showing "pending"/"running" with no way to self-correct short of a
    // manual reload. Stops polling the instant the last-known status is
    // terminal, so a long-finished run doesn't keep refetching forever.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return !status || LIVE_STATUSES.includes(status) ? 3000 : false;
    },
  });
}

// "Recent runs" on the team detail page — added specifically because
// there was previously no way to get back to a past run once you'd
// navigated away from it (the only route in was whatever URL
// useRunAgentTeam's onSuccess navigated to right after triggering it).
export function useTeamRuns(teamId: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["agent-teams", teamId, "runs"],
    queryFn: () => api.get<TeamRunSummary[]>(`/teams/${teamId}/runs`),
    enabled: !!teamId,
  });
}
