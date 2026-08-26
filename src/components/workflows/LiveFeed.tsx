"use client";

import { useEffect, useRef } from "react";
import { Brain, Wrench, CheckCircle2, XCircle, UserCheck, PlayCircle, FlagTriangleRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RunEvent, ToolCallEventData, ToolResultEventData, NodeTransitionEventData, CompleteEventData } from "@/lib/api/types";

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
    case "tool_result": {
      if (isToolResultData(ev.data)) {
        return {
          icon: ev.data.is_error ? XCircle : CheckCircle2,
          text: ev.data.is_error ? `${ev.data.tool} failed` : `${ev.data.tool} returned a result`,
          tone: ev.data.is_error ? "error" : "default",
        };
      }
      return { icon: CheckCircle2, text: "Tool call finished", tone: "default" };
    }
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

/** Auto-scrolling event log — the raw sequence behind AgentPipeline's
 * summarized node states. See WORKFLOW_PLAN_GO.md's Workflow 9 acceptance
 * criteria for the event types this forwards. */
export function LiveFeed({ events }: { events: RunEvent[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        Waiting for the first event…
      </div>
    );
  }

  return (
    <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-border bg-card p-3">
      {events.map((ev, i) => {
        const { icon: Icon, text, tone } = describeEvent(ev);
        return (
          <div key={i} className="flex items-start gap-2 py-1 text-xs">
            <Icon
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                tone === "error" ? "text-destructive" : tone === "success" ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span className={tone === "error" ? "text-destructive" : "text-foreground"}>{text}</span>
            <span className="ml-auto shrink-0 text-muted-foreground/70">{formatTime(ev.timestamp)}</span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
