"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/practice/SopForm";
import { useMyWorkspaces } from "@/hooks/usePortfolio";
import { useCreateReport } from "@/hooks/useReports";
import { ReportSections } from "@/lib/api/types";

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presets() {
  const today = new Date();
  const firstThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const thirtyAgo = new Date(today);
  thirtyAgo.setDate(today.getDate() - 29);
  return [
    { label: "Last month", from: iso(firstLastMonth), to: iso(lastLastMonth) },
    { label: "This month", from: iso(firstThisMonth), to: iso(today) },
    { label: "Last 30 days", from: iso(thirtyAgo), to: iso(today) },
  ];
}

const SECTION_LABELS: { key: keyof ReportSections; label: string; hint: string }[] = [
  { key: "cost", label: "Cost details", hint: "Total AI spend and cost per agent" },
  { key: "tokens", label: "Token details", hint: "Tokens processed" },
  { key: "runs", label: "Run-level detail", hint: "Every run with its result and hours saved" },
];

export default function NewReportPage() {
  const router = useRouter();
  const { data: workspaces, isLoading } = useMyWorkspaces();
  const create = useCreateReport();
  const ranges = useMemo(() => presets(), []);

  // Only workspaces the caller administers can have reports.
  const eligible = (workspaces ?? []).filter((w) => w.role === "owner" || w.role === "admin");
  const [orgId, setOrgId] = useState<string>("");
  const selectedOrg = orgId || eligible.find((w) => w.organization_type === "client_workspace")?.id || eligible[0]?.id || "";

  const [from, setFrom] = useState(ranges[0].from);
  const [to, setTo] = useState(ranges[0].to);
  const [sections, setSections] = useState<ReportSections>({ cost: false, tokens: false, runs: false });
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedOrg) return setError("Pick a workspace");
    if (!from || !to || to < from) return setError("Pick a valid date range");
    create.mutate(
      { org_id: selectedOrg, title: title.trim() || undefined, date_from: from, date_to: to, visible_sections: sections, expires_in_days: expiresInDays },
      {
        onSuccess: (r) => {
          toast.success("Report ready", { description: "Review it, then copy the link to share." });
          router.push(`/practice/reports/${r.id}`);
        },
        onError: (err) => setError(err.message),
      }
    );
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/practice/reports" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Client reports
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New client report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A shareable summary of what you automated — no login needed to view it.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6 rounded-lg border border-border bg-card p-6">
        <div>
          <label htmlFor="report-org" className={labelClass}>Client</label>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : eligible.length === 0 ? (
            <p className="text-sm text-muted-foreground">You don&apos;t administer any workspace you could report on.</p>
          ) : (
            <select id="report-org" value={selectedOrg} onChange={(e) => setOrgId(e.target.value)} className={inputClass}>
              {eligible.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.organization_type === "client_workspace" ? "" : " (your practice)"}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <span className={labelClass}>Period</span>
          <div className="mb-2 flex flex-wrap gap-2">
            {ranges.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => {
                  setFrom(r.from);
                  setTo(r.to);
                }}
                className={`rounded-md border px-2.5 py-1 text-xs ${from === r.from && to === r.to ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="report-from" className="mb-1 block text-xs text-muted-foreground">From</label>
              <input id="report-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="report-to" className="mb-1 block text-xs text-muted-foreground">To</label>
              <input id="report-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div>
          <span className={labelClass}>What the client sees</span>
          <p className="mb-3 text-xs text-muted-foreground">
            Hours saved and completed automations are always included. Anything you leave off here isn&apos;t stored in the report at all.
          </p>
          <div className="space-y-2">
            {SECTION_LABELS.map((s) => (
              <label key={s.key} className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2.5 hover:bg-accent/30">
                <input
                  type="checkbox"
                  checked={sections[s.key]}
                  onChange={(e) => setSections((prev) => ({ ...prev, [s.key]: e.target.checked }))}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-input"
                />
                <span className="text-sm">
                  <span className="text-foreground">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="report-expiry" className={labelClass}>Link expires after</label>
            <select id="report-expiry" value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} className={inputClass}>
              {[7, 30, 90, 365].map((d) => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-title" className={labelClass}>
              Title <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input id="report-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} placeholder="September automation report" className={inputClass} />
          </div>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/practice/reports">Cancel</Link>
          </Button>
          <Button type="submit" size="sm" className="gap-1.5" disabled={create.isPending || !selectedOrg}>
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Generate report
          </Button>
        </div>
      </form>
    </div>
  );
}
