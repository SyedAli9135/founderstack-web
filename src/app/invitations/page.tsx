"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { InvitationsList } from "@/components/organizations/InvitationsList";
import { useLLMProviders } from "@/hooks/useLLMProviders";
import { isNoOrgError } from "@/lib/api/orgSync";
import { Button } from "@/components/ui/button";

// How long to actively poll for the post-accept webhook sync before
// giving up and falling back to the manual "Continue to app" button —
// generous relative to this backend's other webhook-driven syncs (all
// observed landing well under this in prior sessions), not a measured
// bound for this specific event.
const SYNC_POLL_MS = 1500;
const SYNC_TIMEOUT_MS = 20000;

// Deliberately outside the (app) route group — a signed-in user with a
// purely pending invitation has no backend-synced org yet (that only
// happens once organizationMembership.created fires on acceptance), so
// this page must never depend on AppLayout/OnboardingShield or any
// backend call by default. It talks to Clerk only (via InvitationsList),
// except for the opt-in sync poll below, entered only after a real accept.
export default function InvitationsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [syncingOrg, setSyncingOrg] = useState<string | null>(null);
  const [syncTimedOut, setSyncTimedOut] = useState(false);

  const { error, isLoading: providersLoading } = useLLMProviders({
    refetchInterval: syncingOrg && !syncTimedOut ? SYNC_POLL_MS : false,
  });

  useEffect(() => {
    if (!syncingOrg || syncTimedOut) return;
    const timeout = setTimeout(() => setSyncTimedOut(true), SYNC_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [syncingOrg, syncTimedOut]);

  useEffect(() => {
    if (!syncingOrg || providersLoading || isNoOrgError(error)) return;
    // Sync landed — useLLMProviders' cache is now warm, so OnboardingShield's
    // own call on /dashboard reuses it instead of hitting the same 401/404
    // this page was just polling past.
    router.push("/dashboard");
  }, [syncingOrg, providersLoading, error, router]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-4 py-12">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight">FounderStack</span>
        <UserButton />
      </div>

      {syncingOrg ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-6 py-10 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-foreground">Setting up your access to {syncingOrg}…</p>
          {syncTimedOut && (
            <p className="max-w-xs text-xs text-muted-foreground">
              This is taking longer than usual. You can wait a bit longer, or continue and it will
              finish syncing in the background.
            </p>
          )}
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Invitations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organizations that have invited you to join.
            </p>
          </div>

          <InvitationsList onAccepted={setSyncingOrg} />
        </>
      )}

      <div className="flex justify-center border-t border-border pt-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Continue to app</Link>
        </Button>
      </div>
    </div>
  );
}
