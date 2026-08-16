"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, ApiError } from "@/lib/api/client";
import { ApiKeyStatus } from "@/lib/api/types";
import { ApiKeyForm } from "@/components/onboarding/ApiKeyForm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, RefreshCcw, Clock, History } from "lucide-react";
import { format } from "date-fns";

export default function ApiKeySettingsPage() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["api-key-status"],
    queryFn: () => api.get<ApiKeyStatus>("/settings/api-key/status"),
  });

  const deleteMutation = useMutation<void, ApiError>({
    mutationFn: () => api.delete("/settings/api-key"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-key-status"] });
      toast.success("API key revoked");
    },
    onError: (err) => {
      toast.error("Could not revoke key", { description: err.message });
    },
  });

  const hasKey = status?.is_valid === true;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">API key</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the Anthropic key your agents run on.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-medium">Current status</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
              aria-label="Refresh status"
            >
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">{status?.provider || "Not configured"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Key prefix</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {status?.key_prefix || "—"}
              </code>
            </div>
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Updated {status?.updated_at ? format(new Date(status.updated_at), "MMM d, yyyy") : "—"}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <History className="h-3 w-3" />
              Last used{" "}
              {status?.last_used_at ? format(new Date(status.last_used_at), "MMM d, yyyy") : "never"}
            </div>
          </div>

          {hasKey && (
            <Button
              variant="destructive"
              className="mt-5 w-full"
              onClick={() => {
                if (confirm("Revoke this API key? Your agents will stop working immediately.")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Revoke key
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-5">
            <ApiKeyForm />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            We recommend rotating keys periodically. Submitting a new key replaces the current one.
          </p>
        </div>
      </div>
    </div>
  );
}
