"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";
import { motion } from "framer-motion";
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
        queryFn: () => api.get<any>("/settings/api-key/status"),
        // Don't retry keys status too often
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (isLoading) return;

        const isOnboarding = pathname === "/onboarding";
        const hasActiveKey = status?.is_valid === true;

        if (!hasActiveKey && !isOnboarding) {
            // Missing key, kick to onboarding
            router.push("/onboarding");
        } else if (hasActiveKey && isOnboarding) {
            // already has key, kick to dashboard
            router.push("/dashboard");
        }
    }, [status, isLoading, pathname, router]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4 text-center"
                >
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 blur-md animate-pulse" />
                        </div>
                    </div>
                    <p className="text-zinc-500 text-sm font-medium animate-pulse tracking-wide">
                        SYNCHRONIZING FORGE...
                    </p>
                </motion.div>
            </div>
        );
    }

    return <>{children}</>;
}
