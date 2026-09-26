"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RemoveWorkspaceDialog } from "@/components/portfolio/RemoveWorkspaceDialog";
import {
  useClientWorkspaces,
  usePortfolioSummary,
  useRemoveClientWorkspace,
  useRestoreClientWorkspace,
  useMyWorkspaces,
  useSwitchWorkspace,
} from "@/hooks/usePortfolio";
import { ClientWorkspace } from "@/lib/api/types";

// Mock and low-volume runs cost fractions of a cent; "$0.00" would read as
// "nothing happened" on a portfolio view.
function formatUSD(n: number): string {
  if (n > 0 && n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

function formatHours(n: number): string {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function WorkspaceCard({
  ws,
  isCurrent,
  canManage,
  switching,
  onOpen,
  onRemove,
}: {
  ws: ClientWorkspace;
  isCurrent: boolean;
  canManage: boolean;
  switching: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const metrics = [
    { label: "Hours saved", value: formatHours(ws.stats.hours_saved) },
    { label: "Active runs", value: ws.stats.active_runs },
    { label: "Approvals", value: ws.stats.pending_approvals, warn: ws.stats.pending_approvals > 0 },
  ];

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ws.stats.active_runs > 0 ? "bg-primary animate-pulse" : "bg-primary/60"}`} />
            <h3 className="truncate text-sm font-medium text-foreground">{ws.name}</h3>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {ws.client_contact_email ?? `Since ${formatDate(ws.created_at)}`}
          </p>
        </div>
        {isCurrent && (
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">Current</span>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label}>
            <dt className="text-[11px] text-muted-foreground">{m.label}</dt>
            <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${m.warn ? "text-amber-500" : "text-foreground"}`}>{m.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs tabular-nums text-muted-foreground">{formatUSD(ws.stats.total_cost_usd)} spent</span>
        <div className="flex items-center gap-1">
          {canManage && (
            <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={`Remove ${ws.name}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="outline" size="xs" className="gap-1" onClick={onOpen} disabled={isCurrent || switching}>
            {switching ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpRight className="h-3 w-3" />}
            Open
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PracticePage() {
  const { data, isLoading, error } = useClientWorkspaces();
  const { data: summary } = usePortfolioSummary();
  const { data: mine } = useMyWorkspaces();
  const { switchTo, switchingTo } = useSwitchWorkspace();
  const remove = useRemoveClientWorkspace();
  const restore = useRestoreClientWorkspace();
  const [pendingRemoval, setPendingRemoval] = useState<ClientWorkspace | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-base font-semibold">Portfolio unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.code === "NOT_A_PRACTICE_MEMBER"
            ? "This workspace belongs to a practice you're not a member of, so its portfolio isn't visible to you."
            : error.message}
        </p>
      </div>
    );
  }

  const practice = data!.practice;
  const workspaces = data!.workspaces;
  const active = workspaces.filter((w) => w.status === "active");
  const inactive = workspaces.filter((w) => w.status !== "active");
  const canManage = practice.role === "owner" || practice.role === "admin";
  const atLimit = practice.active_client_workspaces >= practice.max_client_workspaces;
  const currentId = mine?.find((w) => w.is_current)?.id;
  const practiceClerkId = mine?.find((w) => w.id === practice.id)?.clerk_org_id;

  const tiles = [
    // The list only ever holds workspaces the viewer belongs to, so for a
    // non-admin this is "yours", not the practice's total against its limit.
    canManage
      ? { label: "Client workspaces", value: `${practice.active_client_workspaces} / ${practice.max_client_workspaces}` }
      : { label: "Your client workspaces", value: practice.active_client_workspaces },
    { label: "Hours saved", value: summary ? formatHours(summary.hours_saved) : null },
    { label: "Active runs", value: summary?.active_runs ?? null },
    { label: "Pending approvals", value: summary?.pending_approvals ?? null },
    { label: "Total spend", value: summary ? formatUSD(summary.total_cost_usd) : null },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {practice.name}
            {currentId !== practice.id && practiceClerkId && (
              <>
                {" · "}
                <button
                  className="text-primary hover:underline disabled:opacity-50"
                  onClick={() => switchTo(practiceClerkId, "/practice")}
                  disabled={!!switchingTo}
                >
                  Switch to practice
                </button>
              </>
            )}
          </p>
        </div>
        {canManage &&
          (atLimit ? (
            <Button size="sm" className="gap-1.5" disabled title="Your plan's client workspace limit is reached">
              <Plus className="h-4 w-4" /> Add client workspace
            </Button>
          ) : (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/practice/new-client">
                <Plus className="h-4 w-4" /> Add client workspace
              </Link>
            </Button>
          ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums">
              {t.value === null ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : t.value}
            </p>
          </div>
        ))}
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {canManage ? "No client workspaces yet" : "You haven't been added to any client workspaces"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {canManage
                ? "Each client gets their own isolated workspace — agents, documents, integrations and runs never cross between clients."
                : "A practice owner or admin can add you to the client workspaces you work on."}
            </p>
          </div>
          {canManage && (
            <Button asChild size="sm" className="mt-1 gap-1.5">
              <Link href="/practice/new-client">
                <Plus className="h-4 w-4" /> Add your first client
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {active.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              ws={ws}
              isCurrent={ws.id === currentId}
              canManage={canManage}
              switching={switchingTo === ws.clerk_org_id}
              onOpen={() => switchTo(ws.clerk_org_id)}
              onRemove={() => setPendingRemoval(ws)}
            />
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Removed workspaces</h2>
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {inactive.map((ws) => (
              <div key={ws.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-foreground">{ws.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ws.status === "deactivated" && ws.restorable_until
                      ? `Restorable until ${formatDate(ws.restorable_until)}`
                      : "Restore window ended"}
                  </p>
                </div>
                {canManage && ws.status === "deactivated" && (
                  <Button
                    variant="outline"
                    size="xs"
                    className="gap-1"
                    disabled={restore.isPending || atLimit}
                    title={atLimit ? "Your plan's client workspace limit is reached" : undefined}
                    onClick={() => restore.mutate(ws)}
                  >
                    <RotateCcw className="h-3 w-3" /> Restore
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <RemoveWorkspaceDialog
        workspace={pendingRemoval}
        pending={remove.isPending}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setPendingRemoval(null);
        }}
        onConfirm={() => {
          if (!pendingRemoval) return;
          const ws = pendingRemoval;
          remove.mutate(ws, {
            onSettled: () => setPendingRemoval(null),
            // Removing the workspace you're standing in would leave every
            // request 404ing; move to the practice first.
            onSuccess: () => {
              if (ws.id === currentId && practiceClerkId) void switchTo(practiceClerkId, "/practice");
            },
          });
        }}
      />
    </div>
  );
}
