"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Loader2, History } from "lucide-react";
import { useRuns } from "@/hooks/useRuns";
import { usePendingApprovals } from "@/hooks/useApprovals";
import { useApiKeyUsage } from "@/hooks/useLLMProviders";
import { HoursSavedCard } from "@/components/analytics/HoursSavedCard";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import { RunStatus } from "@/lib/api/types";

const ACTIVE_STATUSES: RunStatus[] = ["pending", "running", "awaiting_approval"];

const statusDot: Record<RunStatus, string> = {
  pending: "bg-muted-foreground/50",
  running: "bg-primary animate-pulse",
  awaiting_approval: "bg-amber-500",
  completed: "bg-primary",
  failed: "bg-destructive",
  cancelled: "bg-muted-foreground/50",
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

function timeElapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardPage() {
  const { data: runs, isLoading: runsLoading } = useRuns();
  const { data: approvals, isLoading: approvalsLoading } = usePendingApprovals();
  const { data: usage, isLoading: usageLoading } = useApiKeyUsage();

  const activeRunsCount = useMemo(
    () => (runs ?? []).filter((r) => ACTIVE_STATUSES.includes(r.status)).length,
    [runs]
  );
  // Last 8, most recent first — the list endpoint already sorts this way,
  // but slicing defensively keeps the widget correct if that ever changes.
  const recentRuns = useMemo(
    () => [...(runs ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8),
    [runs]
  );

  const statCards = [
    { label: "Active runs", value: runsLoading ? null : activeRunsCount },
    { label: "Pending approvals", value: approvalsLoading ? null : (approvals?.length ?? 0) },
    {
      label: "Tokens this month",
      value: usageLoading
        ? null
        : formatTokens((usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0) + (usage?.cached_tokens ?? 0)),
    },
    { label: "Cost this month", value: usageLoading ? null : formatUSD(usage?.total_estimated_usd ?? 0) },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {stat.value === null ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : stat.value}
            </p>
          </div>
        ))}
      </div>

      <HoursSavedCard />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Recent runs</h2>
            <Link href="/runs" className="text-xs font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          {runsLoading ? (
            <div className="flex min-h-[10rem] items-center justify-center rounded-lg border border-border bg-card">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recentRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
              <History className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No runs yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {recentRuns.map((run) => (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent/40"
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[run.status]}`} />
                    <span className="capitalize text-foreground">{run.status.replace("_", " ")}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{timeElapsed(run.started_at ?? run.created_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Pending approvals</h2>
            <Link href="/approvals" className="text-xs font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          {approvalsLoading ? (
            <div className="flex min-h-[10rem] items-center justify-center rounded-lg border border-border bg-card">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !approvals || approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
              <p className="text-sm text-muted-foreground">Nothing waiting on you</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.slice(0, 2).map((approval) => (
                <ApprovalCard key={approval.id} approval={approval} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
