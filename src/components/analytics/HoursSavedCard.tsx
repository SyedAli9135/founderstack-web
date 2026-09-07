"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useHoursSaved } from "@/hooks/useAnalytics";

function formatHours(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatUSD(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// The investor-facing hero metric — deliberately the largest number on the
// dashboard. hours_saved itself is computed backend-side from each
// workflow's own estimated_manual_minutes (see
// founderstack-api-go/CLAUDE.md's Workflow 11 section); this component
// only renders it.
export function HoursSavedCard() {
  const { data, isLoading, error } = useHoursSaved();

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Hours saved this month</span>
        <span
          className="ml-auto cursor-help text-xs"
          title="Based on the time estimate you set when creating each workflow."
        >
          ⓘ
        </span>
      </div>

      {isLoading ? (
        <div className="flex h-16 items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-destructive">Could not load hours saved.</p>
      ) : (
        <>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-foreground">
            {formatHours(data?.this_month_hours_saved ?? 0)}
            <span className="ml-1.5 text-lg font-normal text-muted-foreground">hrs</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            ≈ {formatUSD((data?.this_month_hours_saved ?? 0) * 50)} saved vs. hiring
          </p>
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            {formatHours(data?.total_hours_saved ?? 0)} hrs all-time · equivalent salary saved{" "}
            {formatUSD(data?.equivalent_salary_usd ?? 0)}
          </p>
        </>
      )}
    </div>
  );
}
