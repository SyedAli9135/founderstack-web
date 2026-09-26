"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { useLLMProviders } from "@/hooks/useLLMProviders";
import { useMyWorkspaces } from "@/hooks/usePortfolio";
import { isNoOrgError } from "@/lib/api/orgSync";
import { ApiError, ACTIVE_ORG_REQUIRED_CODE } from "@/lib/api/client";
import { Loader2 } from "lucide-react";

interface OnboardingShieldProps {
    children: React.ReactNode;
}

export function OnboardingShield({ children }: OnboardingShieldProps) {
    const router = useRouter();
    const pathname = usePathname();

    // Checks ALL 5 providers, not just Anthropic — a founder who only
    // configured e.g. OpenAI must not get bounced back to onboarding
    // forever. Was querying the single-provider /settings/api-key/status
    // (defaults to anthropic), which broke exactly that case.
    const { data: providers, isLoading, error, errorUpdatedAt } = useLLMProviders();

    const hasNoOrg = isNoOrgError(error);
    const needsActiveOrg = error instanceof ApiError && error.code === ACTIVE_ORG_REQUIRED_CODE;

    // The session's active org can be unusable while the person still has
    // usable workspaces: none selected (409), a removed client workspace, or a
    // Clerk org the backend never synced. Switch into a usable one — only
    // someone with none at all belongs on /invitations. Candidates come from
    // the backend, not Clerk's membership list, since Clerk still lists
    // removed/unsynced orgs as memberships.
    const needsRecovery = hasNoOrg || needsActiveOrg;
    const { orgId } = useAuth();
    const { setActive, user } = useClerk();
    const { data: usable, isFetched: usableFetched } = useMyWorkspaces({ enabled: needsRecovery });
    const recoveryTarget = usable?.find((w) => w.clerk_org_id !== orgId);
    // Only an error fetched after the last switch says anything about the
    // current org; right after setActive the cache still holds the previous
    // org's error until the reset refetch lands, and acting on it would
    // switch a second time away from a perfectly good workspace.
    const lastSwitchAt = useRef(0);
    const [recovering, setRecovering] = useState(false);

    useEffect(() => {
        if (!needsRecovery || !usableFetched || !recoveryTarget) return;
        if (errorUpdatedAt <= lastSwitchAt.current) return;
        lastSwitchAt.current = Date.now();
        // Looked up by the token's orgId: useOrganization() can briefly still
        // hold the previously loaded org right after a page load.
        const unavailableName = hasNoOrg
            ? user?.organizationMemberships.find((m) => m.organization.id === orgId)?.organization.name
            : undefined;
        setRecovering(true);
        void setActive({ organization: recoveryTarget.clerk_org_id })
            .then(() => {
                if (unavailableName) {
                    toast.info(`${unavailableName} isn't available`, {
                        description: `Switched you to ${recoveryTarget.name}.`,
                    });
                }
            })
            .finally(() => setRecovering(false));
    }, [needsRecovery, usableFetched, recoveryTarget, errorUpdatedAt, hasNoOrg, orgId, user, setActive]);

    const noUsableWorkspace = usableFetched && !recoveryTarget;

    useEffect(() => {
        if (isLoading || recovering) return;

        if (needsRecovery) {
            if (noUsableWorkspace) router.replace("/invitations");
            return;
        }

        const isOnboarding = pathname === "/onboarding";
        const hasActiveKey = providers?.some((p) => p.is_valid) ?? false;

        // Safely extract search params inside client-side useEffect
        const params = new URLSearchParams(window.location.search);
        const step = params.get("step");
        const hasActiveStep = step && parseInt(step, 10) > 1;

        // The portfolio spans workspaces and never runs agents in the current
        // one, so a brand-new client workspace without a key must not lock the
        // operator out of it.
        const isPortfolio = pathname === "/practice" || pathname.startsWith("/practice/");

        if (!hasActiveKey && !isOnboarding && !isPortfolio) {
            // Missing key, kick to onboarding
            router.push("/onboarding");
        } else if (hasActiveKey && isOnboarding && !hasActiveStep) {
            // already has key, kick to dashboard
            router.push("/dashboard");
        }
    }, [providers, isLoading, recovering, needsRecovery, noUsableWorkspace, pathname, router]);

    // Never mount the app shell (sidebar/header/page — every one of which
    // fires its own org-scoped queries) for a user with no resolvable org.
    // Rendering `children` here even briefly was the actual cause of the
    // API-error pileup a purely-invited recipient used to see: every
    // org-scoped hook across the whole layout fired (and, pre-retry-fix,
    // retried) its own doomed request in the single render before the
    // redirect above took effect.
    if (isLoading || needsRecovery || recovering) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return <>{children}</>;
}
