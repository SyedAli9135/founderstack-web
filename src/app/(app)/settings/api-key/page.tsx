"use client";

import { useState } from "react";
import { useLLMProviders, useDeleteLLMKey } from "@/hooks/useLLMProviders";
import { ApiKeyForm } from "@/components/onboarding/ApiKeyForm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { llmProviderIconMap, llmProviderColorMap } from "@/components/settings/llm-provider-icons";
import { LLMProvider } from "@/lib/api/types";

function ProviderCard({ provider, onEdit }: { provider: LLMProvider; onEdit: () => void }) {
  const deleteMutation = useDeleteLLMKey();
  const Icon = llmProviderIconMap[provider.provider] ?? KeyRound;
  const iconColorClass = llmProviderColorMap[provider.provider] ?? "text-foreground";

  const statusBadge = provider.is_active ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <CheckCircle2 className="h-3 w-3" />
      Active
    </span>
  ) : provider.is_configured ? (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Configured
    </span>
  ) : (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Not configured
    </span>
  );

  const handleDelete = () => {
    if (!confirm(`Remove your ${provider.name} key? Agents using it will stop working immediately.`)) {
      return;
    }
    deleteMutation.mutate(provider.provider, {
      onSuccess: () => toast.success(`${provider.name} key removed`),
      onError: (err) => toast.error("Could not remove key", { description: err.message }),
    });
  };

  return (
    <div className="flex min-h-[176px] flex-col justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <div className="mb-3 flex items-start justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-md bg-accent ${iconColorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          {statusBadge}
        </div>

        <h4 className="text-sm font-medium text-foreground">{provider.name}</h4>
        <code className="mt-1 block text-xs text-muted-foreground">
          {provider.key_prefix ?? "No key on file"}
        </code>
        {provider.updated_at && (
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {format(new Date(provider.updated_at), "MMM d, yyyy")}
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 justify-center" onClick={onEdit}>
          {provider.is_configured ? "Replace key" : "Add key"}
        </Button>
        {provider.is_configured && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${provider.name} key`}
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ApiKeySettingsPage() {
  const { data: providers, isLoading } = useLLMProviders();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const editingMeta = providers?.find((p) => p.provider === editingProvider);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">LLM providers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the API keys your agents run on. Configure as many providers as you like — the
          most recently saved key becomes active.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers?.map((p) => (
            <ProviderCard key={p.provider} provider={p} onEdit={() => setEditingProvider(p.provider)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {editingProvider && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-lg border border-border bg-card p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium">
                {editingMeta?.is_configured ? "Replace" : "Add"} key
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingProvider(null)}>
                Cancel
              </Button>
            </div>
            <ApiKeyForm
              key={editingProvider}
              defaultProvider={editingProvider}
              onSuccess={() => setEditingProvider(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
