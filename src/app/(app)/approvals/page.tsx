"use client";

import { useState } from "react";
import Link from "next/link";
import { useApprovals } from "@/hooks/useApprovals";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import { ShieldAlert, Loader2 } from "lucide-react";

const TABS = ["Pending", "Past"] as const;

export default function ApprovalsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pending");
  const { data: approvals, isLoading, error } = useApprovals(
    tab === "Pending" ? { status: "pending" } : undefined
  );
  const past = tab === "Past" ? approvals?.filter((a) => a.status !== "pending") : approvals;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="border-b border-border pb-6">
        <h1 className="text-xl font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Actions your agents can&apos;t take without a human decision — payments, public posts,
          anything irreversible.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && <p className="py-12 text-center text-sm text-destructive">Could not load approvals</p>}

      {!isLoading && !error && (!past || past.length === 0) && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {tab === "Pending" ? "Nothing waiting on you" : "No past decisions yet"}
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {tab === "Pending"
              ? "When an agent wants to take an irreversible action — a refund, a public post — it shows up here."
              : "Approved and rejected actions will appear here once you've decided on a few."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {past?.map((approval) =>
          // Pending cards have their own Approve/Reject buttons — wrapping
          // those in a Link would nest a button inside an anchor, so only
          // already-decided cards (plain text, no controls) link out to
          // the underlying run.
          approval.status === "pending" ? (
            <ApprovalCard key={approval.id} approval={approval} />
          ) : (
            <Link key={approval.id} href={`/runs/${approval.run_id}`} className="block">
              <ApprovalCard approval={approval} />
            </Link>
          )
        )}
      </div>
    </div>
  );
}
