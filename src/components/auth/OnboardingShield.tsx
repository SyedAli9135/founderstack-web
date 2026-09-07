"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLLMProviders } from "@/hooks/useLLMProviders";
import { isNoOrgError } from "@/lib/api/orgSync";
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
    const { data: providers, isLoading, error } = useLLMProviders();

    const hasNoOrg = isNoOrgError(error);

    useEffect(() => {
        if (isLoading) return;

        if (hasNoOrg) {
            router.replace("/invitations");
            return;
        }

        const isOnboarding = pathname === "/onboarding";
        const hasActiveKey = providers?.some((p) => p.is_valid) ?? false;

        // Safely extract search params inside client-side useEffect
        const params = new URLSearchParams(window.location.search);
        const step = params.get("step");
        const hasActiveStep = step && parseInt(step, 10) > 1;

        if (!hasActiveKey && !isOnboarding) {
            // Missing key, kick to onboarding
            router.push("/onboarding");
        } else if (hasActiveKey && isOnboarding && !hasActiveStep) {
            // already has key, kick to dashboard
            router.push("/dashboard");
        }
    }, [providers, isLoading, hasNoOrg, pathname, router]);

    // Never mount the app shell (sidebar/header/page — every one of which
    // fires its own org-scoped queries) for a user with no resolvable org.
    // Rendering `children` here even briefly was the actual cause of the
    // API-error pileup a purely-invited recipient used to see: every
    // org-scoped hook across the whole layout fired (and, pre-retry-fix,
    // retried) its own doomed request in the single render before the
    // redirect above took effect.
    if (isLoading || hasNoOrg) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return <>{children}</>;
}
