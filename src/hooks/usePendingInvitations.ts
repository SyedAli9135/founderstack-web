"use client";

import { useCallback, useState } from "react";
import { useOrganizationList, useUser } from "@clerk/nextjs";
import { toast } from "sonner";

// @clerk/types isn't a direct dependency here (only @clerk/nextjs is), so
// the invitation shape is derived from useOrganizationList's own return
// type rather than importing it from a package not in package.json.
type UserInvitation = NonNullable<
  ReturnType<typeof useOrganizationList>["userInvitations"]
>["data"] extends (infer T)[] | undefined
  ? T
  : never;

// Clerk's UserOrganizationInvitationResource exposes accept() but no
// reject()/decline() — there is no client-side API for an invitee to
// decline an invitation, only an admin-side "revoke" (already built in
// useTeam.ts's useRevokeInvitation, which the *sender* sees). "Reject"
// here is therefore a local-only dismiss, scoped per Clerk user id so it
// doesn't leak across accounts sharing a browser.
function dismissedKey(clerkUserId: string): string {
  return `founderstack:dismissed-invitations:${clerkUserId}`;
}

function readDismissed(clerkUserId: string): Set<string> {
  try {
    const raw = localStorage.getItem(dismissedKey(clerkUserId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(clerkUserId: string, ids: Set<string>) {
  try {
    localStorage.setItem(dismissedKey(clerkUserId), JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable (private browsing, blocked site data) — the
    // dismissal just won't persist across a reload, not worth surfacing.
  }
}

export function usePendingInvitations() {
  const { user } = useUser();
  const { isLoaded, userInvitations, setActive } = useOrganizationList({
    userInvitations: { infinite: false, pageSize: 10 },
  });
  // Lazy-initialized from localStorage, keyed by the signed-in user's own
  // id — a full remount (e.g. switching accounts) re-reads for the new
  // user rather than needing an effect to react to id changes.
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    user?.id ? readDismissed(user.id) : new Set()
  );
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const pending = (userInvitations?.data ?? []).filter(
    (inv) => inv.status === "pending" && !dismissed.has(inv.id)
  );

  const accept = useCallback(
    async (invitation: UserInvitation): Promise<boolean> => {
      setAcceptingId(invitation.id);
      try {
        await invitation.accept();
        // Switch the active session to the org just joined — accept()
        // alone doesn't move the signed-in user's active organization.
        if (typeof setActive === "function") {
          await setActive({ organization: invitation.publicOrganizationData.id });
        }
        toast.success(`Joined ${invitation.publicOrganizationData.name}`);
        await userInvitations?.revalidate?.();
        return true;
      } catch (err) {
        toast.error("Could not accept invitation", {
          description: err instanceof Error ? err.message : undefined,
        });
        return false;
      } finally {
        setAcceptingId(null);
      }
    },
    [setActive, userInvitations]
  );

  const userId = user?.id;
  const reject = useCallback(
    (invitationId: string) => {
      if (!userId) return;
      setDismissed((prev) => {
        const next = new Set(prev).add(invitationId);
        writeDismissed(userId, next);
        return next;
      });
    },
    [userId]
  );

  return {
    isLoaded,
    invitations: pending,
    accept,
    reject,
    acceptingId,
  };
}
