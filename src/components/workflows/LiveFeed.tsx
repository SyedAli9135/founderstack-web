"use client";

import { useEffect, useRef, useState } from "react";
import {
  Brain,
  Wrench,
  CheckCircle2,
  XCircle,
  UserCheck,
  PlayCircle,
  FlagTriangleRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  RunEvent,
  ReasoningEventData,
  ToolCallEventData,
  ToolResultEventData,
  NodeTransitionEventData,
  CompleteEventData,
} from "@/lib/api/types";

function isReasoningData(data: RunEvent["data"]): data is ReasoningEventData {
  return typeof data === "object" && data !== null && "text" in data;
}

function isToolCallData(data: RunEvent["data"]): data is ToolCallEventData {
  return typeof data === "object" && data !== null && "tool" in data && !("is_error" in data);
}

function isToolResultData(data: RunEvent["data"]): data is ToolResultEventData {
  return typeof data === "object" && data !== null && "is_error" in data;
}

function isNodeTransitionData(data: RunEvent["data"]): data is NodeTransitionEventData {
  return typeof data === "object" && data !== null && "node" in data;
}

function isCompleteData(data: RunEvent["data"]): data is CompleteEventData {
  return typeof data === "object" && data !== null && "output" in data;
}

function describeEvent(ev: RunEvent): { icon: LucideIcon; text: string; tone: "default" | "error" | "success" } {
  switch (ev.type) {
    case "node_start":
      return { icon: PlayCircle, text: `${nodeLabel(ev.data)} started`, tone: "default" };
    case "node_end":
      return { icon: CheckCircle2, text: `${nodeLabel(ev.data)} finished`, tone: "default" };
    case "tool_call":
      return {
        icon: Wrench,
        text: isToolCallData(ev.data) ? `Calling ${ev.data.tool}` : "Calling a tool",
        tone: "default",
      };
    case "approval_required":
      return { icon: UserCheck, text: "Paused — waiting on approval", tone: "default" };
    case "error":
      return { icon: XCircle, text: typeof ev.data === "string" ? ev.data : "An error occurred", tone: "error" };
    case "complete":
      return {
        icon: FlagTriangleRight,
        text: isCompleteData(ev.data) ? `Run complete — $${ev.data.cost_so_far_usd.toFixed(4)}` : "Run complete",
        tone: "success",
      };
    default:
      return { icon: Brain, text: ev.type, tone: "default" };
  }
}

function nodeLabel(data: RunEvent["data"]): string {
  if (!isNodeTransitionData(data)) return "A step";
  const labels: Record<string, string> = {
    planner: "Planner",
    executor: "Executor",
    approval_gate: "Approval gate",
    validator: "Validator",
    reporter: "Reporter",
  };
  return labels[data.node] ?? data.node;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

const rowAnimation = "animate-in fade-in slide-in-from-bottom-1 duration-300";

/** The model's own words right before it acts (or answers) — a distinct
 * voice from the mechanical node/tool lines around it, so a founder can
 * tell "what the agent is thinking" apart from "what the harness is
 * doing" at a glance. */
function ReasoningRow({ ev }: { ev: RunEvent }) {
  const text = isReasoningData(ev.data) ? ev.data.text : "";
  if (!text) return null;
  return (
    <div className={`flex items-start gap-2 border-l-2 border-primary/30 py-1.5 pl-2.5 text-xs ${rowAnimation}`}>
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
      <span className="italic text-foreground/90">{text}</span>
      <span className="ml-auto shrink-0 whitespace-nowrap text-muted-foreground/70">{formatTime(ev.timestamp)}</span>
    </div>
  );
}

/** A tool's real output, collapsed by default (the feed stays scannable)
 * but one click away — the harness already truncates this server-side, so
 * it's always safe to render in full once expanded. */
function ToolResultRow({ ev }: { ev: RunEvent }) {
  const [open, setOpen] = useState(false);
  if (!isToolResultData(ev.data)) return null;
  const { tool, is_error: isError, result } = ev.data;
  const Icon = isError ? XCircle : CheckCircle2;

  return (
    <div className={`py-1 text-xs ${rowAnimation}`}>
      <button
        type="button"
        onClick={() => result && setOpen((o) => !o)}
        className={`flex w-full items-start gap-2 text-left ${result ? "cursor-pointer" : "cursor-default"}`}
      >
        <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isError ? "text-destructive" : "text-muted-foreground"}`} />
        <span className={isError ? "text-destructive" : "text-foreground"}>
          {isError ? `${tool} failed` : `${tool} returned a result`}
        </span>
        {result && (
          <ChevronRight
            className={`mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform ${open ? "rotate-90" : ""}`}
          />
        )}
        <span className="ml-auto shrink-0 whitespace-nowrap text-muted-foreground/70">{formatTime(ev.timestamp)}</span>
      </button>
      {open && result && (
        <pre className="mt-1.5 ml-5 max-h-56 overflow-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {result}
        </pre>
      )}
    </div>
  );
}

/** Auto-scrolling event log — the raw sequence behind AgentPipeline's
 * summarized node states. See WORKFLOW_PLAN_GO.md's Workflow 9 acceptance
 * criteria for the event types this forwards.
 *
 * `isLive` distinguishes two very different reasons `events` can be empty:
 * still connecting/genuinely nothing happened yet (live) vs. the run had
 * already reached a terminal state before this page's SSE stream ever
 * attached, so no events will ever arrive (Engine.Bus doesn't replay past
 * events to a late subscriber — see AgentPipeline's backfill comment).
 * Saying "waiting" in the second case is actively misleading. */
export function LiveFeed({ events, isLive }: { events: RunEvent[]; isLive?: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
        {isLive === false
          ? "This run already finished before the live view connected — see the summary below for the full result."
          : "Waiting for the first event…"}
      </div>
    );
  }

  return (
    <div className="max-h-96 space-y-0.5 overflow-y-auto rounded-lg border border-border bg-card p-3">
      {events.map((ev, i) => {
        if (ev.type === "reasoning") return <ReasoningRow key={i} ev={ev} />;
        if (ev.type === "tool_result") return <ToolResultRow key={i} ev={ev} />;

        const { icon: Icon, text, tone } = describeEvent(ev);
        return (
          <div key={i} className={`flex items-start gap-2 py-1 text-xs ${rowAnimation}`}>
            <Icon
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                tone === "error" ? "text-destructive" : tone === "success" ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span className={tone === "error" ? "text-destructive" : "text-foreground"}>{text}</span>
            <span className="ml-auto shrink-0 whitespace-nowrap text-muted-foreground/70">{formatTime(ev.timestamp)}</span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
