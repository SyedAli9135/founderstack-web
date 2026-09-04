"use client";

import { useState } from "react";
import { Brain, Sparkles, Wrench, UserCheck, ShieldCheck, FileCheck, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StepType, WorkflowStep } from "@/lib/api/types";

const STEP_META: Record<StepType, { label: string; icon: LucideIcon }> = {
  planning: { label: "Planning", icon: Brain },
  reasoning: { label: "Reasoning", icon: Sparkles },
  tool_call: { label: "Tool call", icon: Wrench },
  approval: { label: "Approval", icon: UserCheck },
  validation: { label: "Validation", icon: ShieldCheck },
  report: { label: "Report", icon: FileCheck },
};

function formatDuration(ms?: number): string {
  if (ms === undefined) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

function StepCard({ step }: { step: WorkflowStep }) {
  const [open, setOpen] = useState(false);
  const meta = STEP_META[step.step_type] ?? { label: step.step_type, icon: Brain };
  const Icon = meta.icon;
  const failed = step.status === "failed";
  const hasDetail = step.input_data !== undefined || step.output_data !== undefined;

  return (
    <div className="relative pl-8">
      <span
        className={`absolute top-1 left-0 flex h-6 w-6 items-center justify-center rounded-full border ${
          failed ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-card text-muted-foreground"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-md py-1 text-left text-sm ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className={`font-medium ${failed ? "text-destructive" : "text-foreground"}`}>{meta.label}</span>
        {step.agent_name && <span className="text-xs text-muted-foreground">· {step.agent_name}</span>}
        {step.duration_ms !== undefined && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {formatDuration(step.duration_ms)}
          </span>
        )}
        {(step.input_tokens || step.output_tokens) && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {step.input_tokens ?? 0}/{step.output_tokens ?? 0} tok
          </span>
        )}
        {failed ? (
          <XCircle className="h-3 w-3 shrink-0 text-destructive" />
        ) : (
          <CheckCircle2 className="h-3 w-3 shrink-0 text-primary/70" />
        )}
        <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] text-muted-foreground/70">
          {formatTime(step.created_at)}
        </span>
        {hasDetail && (
          <ChevronRight className={`h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform ${open ? "rotate-90" : ""}`} />
        )}
      </button>
      {open && hasDetail && (
        <div className="mb-2 space-y-1.5">
          {step.input_data !== undefined && (
            <StepJSON label="Input" data={step.input_data} />
          )}
          {step.output_data !== undefined && (
            <StepJSON label="Output" data={step.output_data} />
          )}
        </div>
      )}
    </div>
  );
}

function StepJSON({ label, data }: { label: string; data: unknown }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">{label}</p>
      <pre className="max-h-56 overflow-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

/** The persisted, ordered run trace (workflow 11) — every node transition
 * plus one row per LLM turn and tool call, written server-side as the run
 * actually executes. Distinct from LiveFeed: this reads GET /runs/{id}/steps
 * once (works for a finished run whose live SSE events never arrived, or
 * one from before this page was even open), not the live event stream. */
export function RunTimeline({ steps, isLoading }: { steps?: WorkflowStep[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        Loading trace…
      </div>
    );
  }
  if (!steps || steps.length === 0) {
    return (
      <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
        No trace recorded for this run.
      </div>
    );
  }

  return (
    <div className="space-y-0.5 border-l border-border pl-0">
      {steps.map((step, i) => (
        <StepCard key={i} step={step} />
      ))}
    </div>
  );
}
