"use client";

import { Loader2, Zap } from "lucide-react";
import { useBillingUsage } from "@/hooks/useBilling";
import { UsageTrendChart } from "@/components/analytics/UsageTrendChart";
import { AgentCostShareChart } from "@/components/analytics/AgentCostShareChart";

function formatTokens(n: number): string {
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

const STAT_CARDS = [
  { key: "input_tokens" as const, label: "Total input" },
  { key: "output_tokens" as const, label: "Total output" },
  { key: "cached_tokens" as const, label: "Cached" },
];

export default function UsageAnalyticsPage() {
  const { data, isLoading, error } = useBillingUsage();

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
        <p className="text-sm font-medium text-destructive">Could not load usage</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Token usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last 30 days, across every BYOK provider you&apos;ve configured. All cost figures are
          estimated — you pay your provider directly.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label }) => (
          <div key={key} className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{formatTokens(data?.[key] ?? 0)}</p>
          </div>
        ))}
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Estimated cost</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{formatUSD(data?.total_estimated_usd ?? 0)}</p>
        </div>
      </div>

      {data && data.cache_hit_rate > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <Zap className="h-4 w-4 shrink-0 text-primary" />
          <span>
            Cache hit rate: <span className="font-medium tabular-nums">{(data.cache_hit_rate * 100).toFixed(0)}%</span>{" "}
            <span className="text-muted-foreground">
              of prompt tokens were served from your provider&apos;s prompt cache instead of
              reprocessed — a higher rate means a lower bill for the same work.
            </span>
          </span>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-foreground">Daily usage</h2>
        <UsageTrendChart data={data?.daily_usage} />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-foreground">Cost by agent</h2>
        <AgentCostShareChart items={data?.agent_cost_share} />
      </div>
    </div>
  );
}
