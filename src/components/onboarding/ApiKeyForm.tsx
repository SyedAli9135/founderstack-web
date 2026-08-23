"use client";

import { useState } from "react";
import { useLLMProviders, useSubmitLLMKey } from "@/hooks/useLLMProviders";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ApiError } from "@/lib/api/client";
import { llmProviderSignupURL } from "@/components/settings/llm-provider-icons";

interface ApiKeyFormProps {
    onSuccess?: () => void;
    // Pre-selects a provider — used by the settings page when a founder
    // clicks "Add key" / "Replace key" on a specific provider's card.
    // Onboarding doesn't pass this, so it defaults to Anthropic. The
    // settings page also passes `key={defaultProvider}` so switching which
    // provider is being edited remounts this form with a fresh initial
    // value, rather than syncing the prop into state via an effect.
    defaultProvider?: string;
}

export function ApiKeyForm({ onSuccess, defaultProvider }: ApiKeyFormProps) {
    const { data: providers, isLoading: providersLoading } = useLLMProviders();
    const [provider, setProvider] = useState(defaultProvider ?? "anthropic");
    const [apiKey, setApiKey] = useState("");
    const [error, setError] = useState<string | null>(null);
    const submitMutation = useSubmitLLMKey();

    const selected = providers?.find((p) => p.provider === provider);
    const hint = selected?.key_prefix_hint ?? "";
    const isValidFormat = !hint || apiKey.startsWith(hint) || apiKey.includes("mock-");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKey) return;

        if (!isValidFormat) {
            setError(`API key must start with '${hint}'${selected ? ` (${selected.name} format)` : ""}`);
            return;
        }

        setError(null);
        submitMutation.mutate(
            { provider, api_key: apiKey },
            {
                onSuccess: () => {
                    setApiKey("");
                    toast.success("Workspace secured", {
                        description: `Your ${selected?.name ?? provider} key has been encrypted and validated.`,
                    });
                    onSuccess?.();
                },
                onError: (err) => {
                    const message = err instanceof ApiError ? err.message : "Failed to validate API key";
                    setError(message);
                    toast.error("Validation failed", { description: message });
                },
            }
        );
    };

    const signupUrl = llmProviderSignupURL[provider];

    return (
        <div className="mx-auto w-full max-w-sm">
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="text-left">
                    <label htmlFor="llm-provider" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Provider
                    </label>
                    <select
                        id="llm-provider"
                        value={provider}
                        onChange={(e) => {
                            setProvider(e.target.value);
                            setApiKey("");
                            setError(null);
                        }}
                        disabled={submitMutation.isPending || providersLoading}
                        className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                    >
                        {(providers ?? []).map((p) => (
                            <option key={p.provider} value={p.provider}>
                                {p.name}
                                {p.is_active ? " (active)" : p.is_configured ? " (configured)" : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="relative">
                    <input
                        type="password"
                        placeholder={hint ? `${hint}...` : "API key"}
                        value={apiKey}
                        onChange={(e) => {
                            setApiKey(e.target.value);
                            if (error) setError(null);
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                        disabled={submitMutation.isPending}
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
                    {signupUrl && (
                        <>
                            {" "}
                            Need a key?{" "}
                            <a
                                href={signupUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-foreground underline underline-offset-4"
                            >
                                Get one from {selected?.name ?? provider}
                            </a>
                        </>
                    )}
                </p>

                <Button type="submit" className="w-full" disabled={submitMutation.isPending || !apiKey}>
                    {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate & continue"}
                </Button>
            </form>
        </div>
    );
}
