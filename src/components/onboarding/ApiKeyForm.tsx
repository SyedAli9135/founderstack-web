"use client";

import { useState } from "react";
import { useApiClient } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ApiError } from "@/lib/api/client";

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
            setError("API key must start with 'sk-ant-' (Anthropic format)");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await api.post("/settings/api-key", { api_key: apiKey });
            await queryClient.invalidateQueries({ queryKey: ["api-key-status"] });
            toast.success("Workspace secured", {
                description: "Your Anthropic key has been encrypted and validated.",
            });
            onSuccess?.();
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to validate API key";
            setError(message);
            toast.error("Validation failed", { description: message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-sm">
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                    <input
                        type="password"
                        placeholder="sk-ant-..."
                        value={apiKey}
                        onChange={(e) => {
                            setApiKey(e.target.value);
                            if (error) setError(null);
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                        disabled={isLoading}
                    />
                    {isValidFormat && apiKey.length > 10 && (
                        <ShieldCheck className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                    )}
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-1.5 text-xs text-destructive"
                        >
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="text-xs leading-relaxed text-muted-foreground">
                    Encrypted at rest with AES-256. Used only to run your agents — never stored in
                    plaintext, never shown again after this step.
                </p>

                <Button type="submit" className="w-full" disabled={isLoading || !apiKey}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate & continue"}
                </Button>
            </form>
        </div>
    );
}
