"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLLMProviders } from "@/hooks/useLLMProviders";
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
    const { data: providers, isLoading } = useLLMProviders();

    useEffect(() => {
        if (isLoading) return;

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
    }, [providers, isLoading, pathname, router]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return <>{children}</>;
}
