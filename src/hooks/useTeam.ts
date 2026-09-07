"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useApiClient, ApiError } from "@/lib/api/client";
import { TeamMember, TeamRole, PendingInvitation } from "@/lib/api/types";
import { toast } from "sonner";

export function useTeamMembers() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["org", "members"],
    queryFn: () => api.get<{ members: TeamMember[] }>("/org/members"),
    select: (res) => res.members,
  });
}

export function useUpdateMemberRole() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<{ id: string; role: TeamRole }, ApiError, { id: string; role: TeamRole }>({
    mutationFn: ({ id, role }) => api.patch(`/org/members/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "members"] });
      toast.success("Role updated");
    },
    onError: (err) => {
      toast.error("Could not update role", { description: err.message });
    },
  });
}

export function useRemoveMember() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, ApiError, string>({
    mutationFn: (id) => api.delete(`/org/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "members"] });
      toast.success("Member removed");
    },
    onError: (err) => {
      toast.error("Could not remove member", { description: err.message });
    },
  });
}

// useInvitations reads live from Clerk on every call (no Postgres table to
// cache against — a pending invite only becomes a `users` row once
// accepted). A short refetchInterval keeps the "did it actually send"
// question answerable without a manual refresh, since there's no webhook
// or push signal for "an invite was just created" the way there is for a
// membership change.
export function useInvitations() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["org", "invitations"],
    queryFn: () => api.get<{ invitations: PendingInvitation[] }>("/org/invitations"),
    select: (res) => res.invitations,
    refetchInterval: 15000,
  });
}

export function useRevokeInvitation() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, ApiError, string>({
    mutationFn: (id) => api.delete(`/org/invitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "invitations"] });
      toast.success("Invitation revoked");
    },
    onError: (err) => {
      toast.error("Could not revoke invitation", { description: err.message });
    },
  });
}

// usePermissions derives the signed-in user's own role/permissions by
// matching Clerk's own useUser().user.id against the member list's
// clerk_user_id — no separate GET /org/me endpoint exists (or is needed):
// the member list already carries everything, and every page that needs
// permissions also needs the team roster cached anyway (React Query
// dedupes the underlying request).
export function usePermissions() {
  const { user } = useUser();
  const { data: members, isLoading } = useTeamMembers();

  return useMemo(() => {
    const self = members?.find((m) => m.clerk_user_id === user?.id);
    const role = self?.role;
    const isOwnerOrAdmin = role === "owner" || role === "admin";
    return {
      isLoading,
      role,
      isOwnerOrAdmin,
      canModifyAgents: isOwnerOrAdmin,
      // A workflow's own config (agent, schedule, input template) is
      // gated the same as an agent's — see authctx.User.CanModifyWorkflows'
      // doc comment on the backend. Distinct from canTriggerWorkflows: a
      // member can run one, but not create/edit/delete it.
      canModifyWorkflows: isOwnerOrAdmin,
      canTriggerWorkflows: role !== "viewer",
      canManageAPIKeys: self?.can_manage_api_keys ?? false,
      canManageIntegrations: self?.can_manage_integrations ?? false,
    };
  }, [members, user?.id, isLoading]);
}
