"use client";

import { useState } from "react";
import { ShieldAlert, Check, X, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Approval, RiskLevel } from "@/lib/api/types";
import { useApproveApproval, useRejectApproval } from "@/hooks/useApprovals";

const riskMeta: Record<RiskLevel, { label: string; className: string }> = {
  read: { label: "🟢 Low", className: "bg-primary/15 text-primary" },
  write_reversible: { label: "🟡 Medium", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  write_destructive_or_financial: { label: "🔴 High", className: "bg-destructive/15 text-destructive" },
};

function describeAction(approval: Pick<Approval, "context_data">): string {
  const calls = approval.context_data ?? [];
  if (calls.length === 0) return "An action";
  if (calls.length === 1) return calls[0].name;
  return `${calls.length} actions (${calls.map((c) => c.name).join(", ")})`;
}

// ApprovalCard is used two ways: inline on a live run (runs/[id]/page.tsx,
// built straight from the approval_required SSE event's data — no extra
// fetch) and on the /approvals list page (built from GET /approvals rows).
// Both shapes carry the same fields (Approval and ApprovalRequiredEventData
// are wire-identical — see internal/core/graph/eventbus.go's
// ApprovalRequiredData and internal/api/approvals/handler.go's
// approvalSummary), so this component only needs the subset it actually uses.
export function ApprovalCard({
  approval,
}: {
  approval: Pick<Approval, "id" | "risk_level" | "context_data" | "status" | "expires_at">;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const approve = useApproveApproval();
  const reject = useRejectApproval();

  const decided = approval.status !== "pending";
  const risk = riskMeta[approval.risk_level] ?? riskMeta.write_destructive_or_financial;
  const isPending = approve.isPending || reject.isPending;

  if (decided) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        {approval.status === "approved" && "✅ Approved"}
        {approval.status === "rejected" && "❌ Rejected"}
        {approval.status === "expired" && "⏱ Expired after 24h with no decision"}
        {" — "}
        {describeAction(approval)}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">Needs your approval</p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${risk.className}`}>
              {risk.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{describeAction(approval)}</p>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expanded ? "Hide details" : "Show details"}
          </button>
          {expanded && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted/60 p-3 font-mono text-xs text-foreground">
              {JSON.stringify(approval.context_data, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {rejecting ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you rejecting this? (required)"
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending || reason.trim() === ""}
              onClick={() => reject.mutate({ id: approval.id, reason })}
            >
              {reject.isPending ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <X className="mr-1.5 h-3 w-3" />}
              Confirm reject
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => setRejecting(true)}>
            <X className="mr-1.5 h-3 w-3" />
            Reject
          </Button>
          <Button size="sm" disabled={isPending} onClick={() => approve.mutate({ id: approval.id })}>
            {approve.isPending ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Check className="mr-1.5 h-3 w-3" />}
            Approve
          </Button>
        </div>
      )}
    </div>
  );
}
