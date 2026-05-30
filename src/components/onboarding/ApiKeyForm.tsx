"use client";

import { useState } from "react";
import { useApiClient } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Key, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ApiKeyFormProps {
    onSuccess?: () => void;
}

export function ApiKeyForm({ onSuccess }: ApiKeyFormProps) {
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const api = useApiClient();
    const queryClient = useQueryClient();

    const isValidFormat = apiKey.startsWith("sk-ant-") || apiKey.includes("mock-");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKey) return;

        if (!isValidFormat) {
            setError("API Key must start with 'sk-ant-' (Anthropic format)");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await api.post("/settings/api-key", { api_key: apiKey });

            // Invalidate the status query so OnboardingShield and other components refresh
            await queryClient.invalidateQueries({ queryKey: ["api-key-status"] });

            toast.success("Workspace Secured!", {
                description: "Your Anthropic key has been encrypted and validated.",
            });
            onSuccess?.();
        } catch (err: any) {
            const message = err.message || "Failed to validate API key";
            setError(message);
            toast.error("Validation Failed", {
                description: message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl rounded-2xl p-6 shadow-2xl"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Key className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Secure Your Workspace</h3>
                        <p className="text-sm text-zinc-400">Connect your Anthropic API Key</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <input
                                type="password"
                                placeholder="sk-ant-..."
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    if (error) setError(null);
                                }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                disabled={isLoading}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                {isValidFormat && apiKey.length > 10 ? (
                                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                ) : null}
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-2 text-red-400 text-sm pl-1"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <p className="text-[11px] text-zinc-500 px-1 leading-relaxed">
                        Your key is encrypted using AES-256 (Fernet) and never stored in plaintext.
                        We use it only to execute your agent commands.
                    </p>

                    <Button
                        type="submit"
                        className="w-full bg-white hover:bg-zinc-200 text-black font-semibold h-11 transition-all group"
                        disabled={isLoading || !apiKey}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <span className="flex items-center gap-2">
                                Validate & Continue
                            </span>
                        )}
                    </Button>
                </form>
            </motion.div>
        </div>
    );
}
