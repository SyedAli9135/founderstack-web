"use client";

import { useState } from "react";
import { useConnectIntegration } from "@/hooks/useIntegrations";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ApiError } from "@/lib/api/client";

interface IntegrationApiKeyFormProps {
  service: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const COPY: Record<string, { label: string; placeholder: string }> = {
  stripe: { label: "Stripe secret key", placeholder: "sk_live_… or sk_test_…" },
  github: { label: "GitHub personal access token", placeholder: "ghp_…" },
};

export function IntegrationApiKeyForm({ service, onSuccess, onCancel }: IntegrationApiKeyFormProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const connectMutation = useConnectIntegration();

  const copy = COPY[service] ?? { label: "API key", placeholder: "" };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setError(null);
    connectMutation.mutate(
      { service, key },
      {
        onSuccess: () => onSuccess?.(),
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : "Failed to validate key");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 text-left">
      <label className="block text-xs font-medium text-muted-foreground">{copy.label}</label>
      <input
        type="password"
        placeholder={copy.placeholder}
        value={key}
        onChange={(e) => {
          setKey(e.target.value);
          if (error) setError(null);
        }}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        disabled={connectMutation.isPending}
        autoFocus
      />

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

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={connectMutation.isPending}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={connectMutation.isPending || !key.trim()}>
          {connectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save & connect"}
        </Button>
      </div>
    </form>
  );
}
