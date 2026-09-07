"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  useTeamMembers,
  useUpdateMemberRole,
  useRemoveMember,
  usePermissions,
  useInvitations,
  useRevokeInvitation,
} from "@/hooks/useTeam";
import { TeamMember, TeamRole, PendingInvitation } from "@/lib/api/types";
import { Loader2, Users, Trash2, UserPlus, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_BADGE_CLASS: Record<TeamRole, string> = {
  owner: "bg-primary/10 text-primary",
  admin: "bg-primary/10 text-primary",
  member: "bg-muted text-muted-foreground",
  viewer: "bg-accent text-accent-foreground",
};

function formatLastLogin(iso?: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function initials(member: TeamMember): string {
  const source = member.full_name?.trim() || member.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function Avatar({ member }: { member: TeamMember }) {
  if (member.avatar_url) {
    // Avatar URLs are third-party (Clerk-hosted), not a local asset next/image can optimize.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={member.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
      {initials(member)}
    </div>
  );
}

function MemberRow({ member, isSelf, canManage }: { member: TeamMember; isSelf: boolean; canManage: boolean }) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <Avatar member={member} />
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">
              {member.full_name || member.email}
              {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(You)</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        {canManage && !isSelf ? (
          <select
            value={member.role}
            onChange={(e) => updateRole.mutate({ id: member.id, role: e.target.value as TeamRole })}
            disabled={updateRole.isPending}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            {(Object.keys(ROLE_LABELS) as TeamRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASS[member.role]}`}>
            {ROLE_LABELS[member.role]}
          </span>
        )}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">{formatLastLogin(member.last_login_at)}</td>
      <td className="py-3 text-right">
        {canManage && !isSelf ? (
          confirmingRemove ? (
            <div className="flex justify-end gap-2">
              <Button size="xs" variant="ghost" onClick={() => setConfirmingRemove(false)} disabled={removeMember.isPending}>
                Cancel
              </Button>
              <Button
                size="xs"
                variant="destructive"
                onClick={() => removeMember.mutate(member.id, { onSuccess: () => setConfirmingRemove(false) })}
                disabled={removeMember.isPending}
              >
                {removeMember.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
              </Button>
            </div>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              title="Remove from team"
              onClick={() => setConfirmingRemove(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )
        ) : (
          <span className="text-xs text-muted-foreground">
            {isSelf ? "" : "View only"}
          </span>
        )}
      </td>
    </tr>
  );
}

// Clerk's own invitation role string is namespaced ("org:member") — this
// app's PATCH .../role never touches invitations, so there's no
// normalizeRole equivalent to reuse here; just strip the prefix for display.
function formatInviteRole(role: string): string {
  const stripped = role.replace(/^org:/, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function InvitationRow({ invitation }: { invitation: PendingInvitation }) {
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const revoke = useRevokeInvitation();

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4 text-sm text-foreground">{invitation.email}</td>
      <td className="py-3 pr-4">
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {formatInviteRole(invitation.role)}
        </span>
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">{formatDate(invitation.created_at)}</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">{formatDate(invitation.expires_at)}</td>
      <td className="py-3 text-right">
        {confirmingRevoke ? (
          <div className="flex justify-end gap-2">
            <Button size="xs" variant="ghost" onClick={() => setConfirmingRevoke(false)} disabled={revoke.isPending}>
              Cancel
            </Button>
            <Button
              size="xs"
              variant="destructive"
              onClick={() => revoke.mutate(invitation.id, { onSuccess: () => setConfirmingRevoke(false) })}
              disabled={revoke.isPending}
            >
              {revoke.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Revoke"}
            </Button>
          </div>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            title="Revoke invitation"
            onClick={() => setConfirmingRevoke(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </td>
    </tr>
  );
}

// Only rendered for an owner/admin (same guard as the "Invite member"
// button) — the backend 403s a non-admin anyway, but there's no reason to
// even issue the request or show an empty-looking card to someone who
// can't act on it.
function PendingInvitationsCard() {
  const { data: invitations, isLoading, error } = useInvitations();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium text-destructive">Could not load pending invitations</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const items = invitations ?? [];
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <MailWarning className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Pending invitations</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Email</th>
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 pr-4 font-medium">Sent</th>
              <th className="pb-2 pr-4 font-medium">Expires</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((invitation) => (
              <InvitationRow key={invitation.id} invitation={invitation} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TeamSettingsPage() {
  const { user } = useUser();
  const clerk = useClerk();
  const { data: members, isLoading, error } = useTeamMembers();
  const { isOwnerOrAdmin } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-destructive">Could not load team members</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const items = members ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who has access to this organization and what they can do.
          </p>
        </div>
        {isOwnerOrAdmin && (
          <Button size="sm" onClick={() => clerk.openOrganizationProfile()}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Invite member
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">Members</h2>
        </div>

        {!isOwnerOrAdmin && (
          <p className="mb-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Only an owner or admin can change roles or remove members. Contact one of them to make changes.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Member</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Last login</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isSelf={member.clerk_user_id === user?.id}
                  canManage={isOwnerOrAdmin}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isOwnerOrAdmin && <PendingInvitationsCard />}
    </div>
  );
}
