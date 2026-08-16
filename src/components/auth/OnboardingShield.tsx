"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";
import { ApiKeyStatus } from "@/lib/api/types";
import { Loader2 } from "lucide-react";

interface OnboardingShieldProps {
    children: React.ReactNode;
}

export function OnboardingShield({ children }: OnboardingShieldProps) {
    const router = useRouter();
    const pathname = usePathname();
    const api = useApiClient();

    const { data: status, isLoading } = useQuery({
        queryKey: ["api-key-status"],
        queryFn: () => api.get<ApiKeyStatus>("/settings/api-key/status"),
        // Don't retry keys status too often
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (isLoading) return;

        const isOnboarding = pathname === "/onboarding";
        const hasActiveKey = status?.is_valid === true;

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
    }, [status, isLoading, pathname, router]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return <>{children}</>;
}
