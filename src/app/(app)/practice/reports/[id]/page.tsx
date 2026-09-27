"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/practice/ConfirmDialog";
import { ReportView } from "@/components/reports/ReportView";
import { copyShareLink, shareUrl, useReport, useRevokeReport } from "@/hooks/useReports";

const statusBadge = {
  active: { label: "Active", className: "border-primary/30 text-primary" },
  expired: { label: "Expired", className: "border-border text-muted-foreground" },
  revoked: { label: "Revoked", className: "border-destructive/30 text-destructive" },
} as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// The operator's preview renders the exact client view (ReportView) under a
// share bar. Opening it here never counts as a client view.
export default function ReportPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: report, isLoading, error } = useReport(id);
  const revoke = useRevokeReport();
  const [confirm, setConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !report?.snapshot) {
    return <p className="py-20 text-center text-sm text-muted-foreground">{error?.message ?? "Report not found"}</p>;
  }
  const st = statusBadge[report.status];
  const active = report.status === "active";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/practice/reports" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Client reports
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="min-w-0 text-sm">
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${st.className}`}>{st.label}</span>
            <span className="text-muted-foreground">
              {report.view_count} {report.view_count === 1 ? "view" : "views"}
              {active && ` · expires ${formatDate(report.expires_at)}`}
            </span>
          </div>
          {active && <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{shareUrl(report)}</p>}
        </div>
        {active && (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirm(true)}>
              Revoke
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={report.share_path} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => copyShareLink(report)}>
              <Copy className="h-3.5 w-3.5" /> Copy link
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border p-6 sm:p-10">
        <p className="mb-6 text-xs text-muted-foreground">Preview — this is exactly what your client sees.</p>
        <ReportView title={report.title} snapshot={report.snapshot} />
      </div>

      <ConfirmDialog
        open={confirm}
        title="Revoke link"
        description={<>Anyone opening the link to “{report.title}” will see that it’s no longer available. This takes effect immediately.</>}
        confirmLabel="Revoke link"
        pending={revoke.isPending}
        onOpenChange={setConfirm}
        onConfirm={() => revoke.mutate(report, { onSettled: () => setConfirm(false) })}
      />
    </div>
  );
}
