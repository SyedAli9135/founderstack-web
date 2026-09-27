"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Eye, FileBarChart, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/practice/ConfirmDialog";
import { copyShareLink, useReports, useRevokeReport } from "@/hooks/useReports";
import { ClientReport, ReportStatus } from "@/lib/api/types";

const statusBadge: Record<ReportStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "border-primary/30 text-primary" },
  expired: { label: "Expired", className: "border-border text-muted-foreground" },
  revoked: { label: "Revoked", className: "border-destructive/30 text-destructive" },
};

function formatDate(iso: string) {
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ReportsPage() {
  const { data, isLoading, error } = useReports();
  const revoke = useRevokeReport();
  const [revoking, setRevoking] = useState<ClientReport | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return <p className="py-20 text-center text-sm text-destructive">{error.message}</p>;
  }
  const reports = data?.reports ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href="/practice" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Portfolio
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Client reports</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Share what you automated with a link — clients don&apos;t need an account to view it.
            </p>
          </div>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/practice/reports/new">
              <Plus className="h-4 w-4" /> New report
            </Link>
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <FileBarChart className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">No reports yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Generate a monthly report for a client — hours saved, automations completed — and send them the link.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {reports.map((r) => {
            const st = statusBadge[r.status];
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/practice/reports/${r.id}`} className="truncate text-sm text-foreground hover:underline">
                      {r.title}
                    </Link>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${st.className}`}>{st.label}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {r.org_name} · {formatDate(r.date_from)} – {formatDate(r.date_to)} ·{" "}
                    {r.view_count} {r.view_count === 1 ? "view" : "views"}
                    {r.last_viewed_at && ` · last viewed ${formatDate(r.last_viewed_at)}`}
                    {r.status === "active" && ` · expires ${formatDate(r.expires_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button asChild variant="ghost" size="xs" className="gap-1">
                    <Link href={`/practice/reports/${r.id}`}>
                      <Eye className="h-3 w-3" /> Preview
                    </Link>
                  </Button>
                  {r.status === "active" && (
                    <>
                      <Button variant="outline" size="xs" className="gap-1" onClick={() => copyShareLink(r)}>
                        <Copy className="h-3 w-3" /> Copy link
                      </Button>
                      <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-destructive" onClick={() => setRevoking(r)}>
                        Revoke
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!revoking}
        title="Revoke link"
        description={<>Anyone opening the link to “{revoking?.title}” will see that it’s no longer available. This takes effect immediately.</>}
        confirmLabel="Revoke link"
        pending={revoke.isPending}
        onOpenChange={(o) => !o && setRevoking(null)}
        onConfirm={() => revoking && revoke.mutate(revoking, { onSettled: () => setRevoking(null) })}
      />
    </div>
  );
}
