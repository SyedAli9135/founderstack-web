"use client";

import { useEffect } from "react";
import { useIntegrations } from "@/hooks/useIntegrations";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function IntegrationsPage() {
  const { data: integrations, isLoading, error } = useIntegrations();

  // Show a toast when returning from an OAuth redirect (?connected=slack)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedService = params.get("connected");
    if (connectedService) {
      toast.success(`${connectedService} connected`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-destructive">Could not load integrations</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const items = integrations ?? [];
  const connectedCount = items.filter((item) => item.status === "connected").length;
  const categories = Array.from(new Set(items.map((item) => item.category)));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect the tools your agents act on your behalf with.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {connectedCount} of {items.length} connected
        </span>
      </div>

      <div className="space-y-8">
        {categories.map((category) => {
          const categoryItems = items.filter((item) => item.category === category);
          return (
            <div key={category} className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {category}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryItems.map((integration) => (
                  <IntegrationCard key={integration.service} integration={integration} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
