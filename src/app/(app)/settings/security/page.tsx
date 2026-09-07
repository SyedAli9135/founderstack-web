"use client";

import { useState } from "react";
import { Loader2, Shield, User, Bot, Cog } from "lucide-react";
import { usePermissions } from "@/hooks/useTeam";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { AuditLogEntry } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

const ACTOR_ICONS: Record<string, typeof User> = { user: User, agent: Bot, system: Cog };

const STATUS_BADGE_CLASS: Record<string, string> = {
  success: "bg-primary/10 text-primary",
  error: "bg-destructive/10 text-destructive",
  denied: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ActorCell({ entry }: { entry: AuditLogEntry }) {
  const Icon = ACTOR_ICONS[entry.actor_type] ?? Cog;
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-foreground">{entry.actor_name}</span>
    </span>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        STATUS_BADGE_CLASS[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

// Deliberately no edit/delete anywhere on this page — audit_logs is
// append-only by design (this app's own compliance guarantee, per the
// plan's own acceptance criteria), so there's nothing here to build.
export default function SecurityAuditLogPage() {
  const { isOwnerOrAdmin, isLoading: permissionsLoading } = usePermissions();

  const [actorType, setActorType] = useState("");
  const [action, setAction] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuditLogs({
    actorType: actorType || undefined,
    action: action || undefined,
    status: status || undefined,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : undefined,
  });

  if (permissionsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Hidden from members/viewers — the backend independently enforces this
  // (403 for anyone but owner/admin), this is convenience/clarity, not
  // the actual boundary, matching every other role-gated page in this app.
  if (!isOwnerOrAdmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <Shield className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Owner or admin access required</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Ask an owner or admin if you need to review the audit log.
        </p>
      </div>
    );
  }

  const entries = data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="border-b border-border pb-6">
        <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A permanent, append-only record of every action your agents and team took.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Actor type</label>
          <select
            value={actorType}
            onChange={(e) => setActorType(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="">All</option>
            <option value="user">User</option>
            <option value="agent">Agent</option>
            <option value="system">System</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="denied">Denied</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Action</label>
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. workflow.approval"
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-medium text-destructive">Could not load the audit log</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <Shield className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nothing matches these filters</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Timestamp</th>
                  <th className="px-4 py-2.5 font-medium">Actor</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Resource</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {formatTimestamp(entry.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <ActorCell entry={entry} />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground">{entry.action}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {entry.resource_type ?? "—"}
                      {entry.resource_id ? ` · ${entry.resource_id.slice(0, 8)}` : ""}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={entry.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
