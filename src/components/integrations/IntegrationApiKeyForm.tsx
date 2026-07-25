"use client";

import { useState } from "react";
import { useConnectIntegration } from "@/hooks/useIntegrations";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IntegrationApiKeyFormProps {
  service: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function IntegrationApiKeyForm({ service, onSuccess, onCancel }: IntegrationApiKeyFormProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const connectMutation = useConnectIntegration();

  const isStripe = service === "stripe";
  const label = isStripe ? "Stripe Secret Key" : "GitHub Personal Access Token";
  const placeholder = isStripe ? "sk_live_..." : "ghp_...";
  const description = isStripe
    ? "Enter your secret key. Starts with sk_live_ or sk_test_."
    : "Enter a personal access token (classic or fine-grained) with repo scopes.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setError(null);

    connectMutation.mutate(
      { service, key },
      {
        onSuccess: () => {
          onSuccess?.();
        },
        onError: (err: any) => {
          setError(err.message || "Failed to validate key");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-left">
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-400 block tracking-wide uppercase">{label}</label>
        <div className="relative">
          <input
            type="password"
            placeholder={placeholder}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              if (error) setError(null);
            }}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all"
            disabled={connectMutation.isPending}
          />
        </div>
        <p className="text-[10px] text-zinc-500 leading-normal">{description}</p>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-1.5 text-red-400 text-xs mt-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-zinc-400 hover:text-white text-xs h-8 px-3 hover:bg-zinc-900 border border-transparent hover:border-zinc-850"
            disabled={connectMutation.isPending}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold h-8 px-3 transition-all"
          disabled={connectMutation.isPending || !key.trim()}
        >
          {connectMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            "Save & Connect"
          )}
        </Button>
      </div>
    </form>
  );
}
