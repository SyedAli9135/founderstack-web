"use client";

import { useEffect } from "react";
import { useIntegrations } from "@/hooks/useIntegrations";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { toast } from "sonner";
import { Loader2, Puzzle, Check } from "lucide-react";

export default function IntegrationsPage() {
  const { data: integrations, isLoading, error } = useIntegrations();

  // Show Toast when returned from OAuth redirect callback (e.g. ?connected=slack)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedService = params.get("connected");
    if (connectedService) {
      toast.success(`${connectedService.toUpperCase()} Connected!`, {
        description: "Your workspace is now synced.",
      });
      // Clear the query parameter from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-zinc-500 text-sm animate-pulse tracking-wide font-medium">RETRIEVING INTEGRATION CATALOG...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 border border-zinc-800/80 rounded-2xl bg-zinc-900/10">
        <p className="text-red-400 font-semibold mb-2">Error Loading Integrations</p>
        <p className="text-zinc-500 text-sm max-w-md">{(error as any)?.message || "Could not retrieve the catalog. Please try again later."}</p>
      </div>
    );
  }

  const items = integrations || [];
  const connectedCount = items.filter((item) => item.status === "connected").length;

  // Group by category
  const categories = Array.from(new Set(items.map((item) => item.category)));

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <Puzzle className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Integrations Hub</h1>
          </div>
          <p className="text-sm text-zinc-400 font-light">
            Connect and manage external platforms to supercharge your AI agents.
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 flex items-center gap-2">
          <Check className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            {connectedCount} Connected
          </span>
        </div>
      </div>

      {/* Grid by category */}
      <div className="space-y-10">
        {categories.map((category) => {
          const categoryItems = items.filter((item) => item.category === category);
          const categoryConnectedCount = categoryItems.filter((item) => item.status === "connected").length;

          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-2">
                <h3 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">{category}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900 border border-zinc-850 text-zinc-500">
                  {categoryConnectedCount} connected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
