"use client";

import { useEffect, useState } from "react";
import { useIntegrations } from "@/hooks/useIntegrations";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function IntegrationsPage() {
  const { data: integrations, isLoading, error } = useIntegrations();
  // Workflow 16: a live run's "needs reconnection" banner links here as
  // ?reconnect=service — highlight that one card briefly instead of
  // leaving the founder to hunt for it among every connected service.
  // Captured via lazy init (not a mount effect + setState — this codebase
  // already hit the react-hooks/set-state-in-effect rule once before, see
  // src/app/(app)/settings/notifications/page.tsx's own note on the same
  // fix) since the URL only needs reading once, before first paint.
  const [highlightedService, setHighlightedService] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("reconnect")
  );

  // Show a toast when returning from an OAuth redirect (?connected=slack)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedService = params.get("connected");
    if (connectedService) {
      toast.success(`${connectedService} connected`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!highlightedService) return;
    window.history.replaceState({}, "", window.location.pathname);
    const timeout = setTimeout(() => setHighlightedService(null), 4000);
    return () => clearTimeout(timeout);
    // Only the mount-time value matters — clearing highlightedService itself
    // must not re-trigger this (it would immediately clear the timeout it
    // just set and re-strip a URL that's already clean).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                  <IntegrationCard
                    key={integration.service}
                    integration={integration}
                    highlighted={integration.service === highlightedService}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
