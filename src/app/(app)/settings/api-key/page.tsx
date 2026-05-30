"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";
import { ApiKeyForm } from "@/components/onboarding/ApiKeyForm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Key,
    Trash2,
    RefreshCcw,
    ShieldCheck,
    ShieldAlert,
    Clock,
    History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function ApiKeySettingsPage() {
    const api = useApiClient();
    const queryClient = useQueryClient();

    const { data: status, isLoading, refetch } = useQuery({
        queryKey: ["api-key-status"],
        queryFn: () => api.get<any>("/settings/api-key/status"),
    });

    const deleteMutation = useMutation({
        mutationFn: () => api.delete("/settings/api-key"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["api-key-status"] });
            toast.success("API Key Revoked", {
                description: "Your key has been securely removed from the registry.",
            });
        },
        onError: (error: any) => {
            toast.error("Deletion Failed", {
                description: error.message || "Failed to revoke the API key.",
            });
        },
    });

    const hasKey = status?.is_valid === true;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">API Configuration</h1>
                <p className="text-zinc-400 text-sm">
                    Manage your Anthropic integration and secure your forge metadata.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-blue-400" />
                            Current Status
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isLoading}
                            className="text-zinc-500 hover:text-white"
                        >
                            <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-900">
                            <span className="text-sm text-zinc-400">Provider</span>
                            <span className="text-sm font-medium text-white">{status?.provider || "Not Configured"}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-900">
                            <span className="text-sm text-zinc-400">Key Prefix</span>
                            <code className="text-xs text-blue-400 bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10">
                                {status?.key_prefix || "••••••••"}
                            </code>
                        </div>

                        <div className="space-y-2 pt-2">
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <Clock className="w-3 h-3" />
                                <span>Last Updated: {status?.updated_at ? format(new Date(status.updated_at), "MMM d, yyyy HH:mm") : "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <History className="w-3 h-3" />
                                <span>Last Used: {status?.last_used_at ? format(new Date(status.last_used_at), "MMM d, yyyy HH:mm") : "Never"}</span>
                            </div>
                        </div>

                        {hasKey && (
                            <Button
                                variant="destructive"
                                className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                                onClick={() => {
                                    if (confirm("Are you sure you want to revoke this API key? Your agents will stop working immediately.")) {
                                        deleteMutation.mutate();
                                    }
                                }}
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Revoke Key
                            </Button>
                        )}
                    </div>
                </motion.div>

                {/* Update/Form Card */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                >
                    <div className="bg-zinc-950/30 border border-dashed border-zinc-800 rounded-2xl p-1 text-center">
                        <div className="p-1">
                            <ApiKeyForm />
                        </div>
                    </div>

                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-3">
                        <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                            For security, we recommend rotating your keys every 90 days.
                            Submit a new key to automatically overwrite the existing one.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
