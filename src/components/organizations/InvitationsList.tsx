"use client";

import { Loader2, Mail } from "lucide-react";
import { usePendingInvitations } from "@/hooks/usePendingInvitations";
import { Button } from "@/components/ui/button";

function formatRole(role: string): string {
  const stripped = role.replace(/^org:/, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

interface InvitationsListProps {
  // Fired only after a real, successful invitation.accept() — lets the
  // standalone /invitations page start polling for backend sync instead
  // of letting the user click through to a page that will just 401 until
  // the organizationMembership.created webhook lands.
  onAccepted?: (orgName: string) => void;
}

// The actual accept/reject UI, shared by the standalone /invitations page
// (reachable by a signed-in user with no org yet) and the in-app nav tab
// (for a user who already belongs to some org and gets invited to
// another). Pure Clerk data — see usePendingInvitations — so it's safe to
// render in either context without triggering a backend call.
export function InvitationsList({ onAccepted }: InvitationsListProps) {
  const { isLoaded, invitations, accept, reject, acceptingId } = usePendingInvitations();

  if (!isLoaded) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-6 py-10 text-center">
        <Mail className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No pending invitations right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4"
        >
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">{invitation.publicOrganizationData.name}</p>
              <p className="text-xs text-muted-foreground">
                Invited you to join as {formatRole(invitation.role)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => reject(invitation.id)}
              disabled={acceptingId === invitation.id}
              title="Dismiss — this only hides it here, it doesn't notify the sender"
            >
              Reject
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                const ok = await accept(invitation);
                if (ok) onAccepted?.(invitation.publicOrganizationData.name);
              }}
              disabled={acceptingId === invitation.id}
            >
              {acceptingId === invitation.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Accept"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
