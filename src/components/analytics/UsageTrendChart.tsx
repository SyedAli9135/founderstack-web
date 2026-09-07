"use client";

import { useMemo, useState } from "react";
import { DailyUsagePoint } from "@/lib/api/types";

type TokenType = "input" | "output" | "cached";

// Fixed categorical order/color, matching CostBreakdown's own convention —
// color follows the token type, never sort rank.
const TOKEN_TYPE_META: Record<TokenType, { label: string; colorVar: string }> = {
  input: { label: "Input", colorVar: "var(--chart-1)" },
  output: { label: "Output", colorVar: "var(--chart-2)" },
  cached: { label: "Cached", colorVar: "var(--chart-3)" },
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// A stacked BAR chart, not the AREA chart WORKFLOW_PLAN_GO.md's Workflow 14
// spec literally calls for — the same deviation reasoning as workflow 11's
// CostBreakdown (see that component's own comment): the underlying data is
// one discrete total per calendar day, not a continuously sampled
// quantity, and an area chart's interpolation between points implies a
// smoothness this data doesn't have. A stacked bar reads the same
// information (magnitude + composition per day) without that implication.
export function UsageTrendChart({ data, isLoading }: { data?: DailyUsagePoint[]; isLoading?: boolean }) {
  const [hovered, setHovered] = useState<TokenType | null>(null);

  const { days, maxTotal } = useMemo(() => {
    const days = (data ?? []).map((d) => ({
      ...d,
      total: d.input_tokens + d.output_tokens + d.cached_tokens,
    }));
    const maxTotal = Math.max(1, ...days.map((d) => d.total));
    return { days, maxTotal };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        Loading usage trend…
      </div>
    );
  }
  if (days.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
        No token usage recorded in the last 30 days.
      </div>
    );
  }

  // Show every day's bar, but only label roughly every 5th to keep the
  // x-axis legible at 30 bars — recessive grid/axis text per the dataviz
  // skill, not a label crammed under every bar.
  const labelEvery = Math.max(1, Math.ceil(days.length / 6));

  return (
    <div className="space-y-3">
      <div
        className="flex h-40 items-end gap-1"
        role="img"
        aria-label="Daily token usage, stacked by type, over the last 30 days"
      >
        {days.map((day) => {
          const segments = [
            { type: "input" as const, value: day.input_tokens },
            { type: "output" as const, value: day.output_tokens },
            { type: "cached" as const, value: day.cached_tokens },
          ].filter((s) => s.value > 0);

          return (
            <div
              key={day.day}
              className="group flex h-full flex-1 flex-col justify-end"
              title={`${formatDayLabel(day.day)}: ${formatTokens(day.total)} tokens ($${day.estimated_cost_usd.toFixed(2)})`}
            >
              <div
                className="flex w-full flex-col justify-end overflow-hidden rounded-t-sm"
                style={{ height: `${(day.total / maxTotal) * 100}%`, minHeight: day.total > 0 ? "2px" : 0 }}
              >
                {[...segments].reverse().map((seg) => (
                  <div
                    key={seg.type}
                    onMouseEnter={() => setHovered(seg.type)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      height: `${(seg.value / day.total) * 100}%`,
                      backgroundColor: TOKEN_TYPE_META[seg.type].colorVar,
                      opacity: hovered && hovered !== seg.type ? 0.4 : 1,
                    }}
                    className="w-full transition-opacity"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 text-[10px] text-muted-foreground">
        {days.map((day, i) => (
          <div key={day.day} className="flex-1 text-center">
            {i % labelEvery === 0 ? formatDayLabel(day.day) : ""}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3">
        {(Object.keys(TOKEN_TYPE_META) as TokenType[]).map((type) => (
          <div
            key={type}
            className="flex items-center gap-1.5 text-xs"
            onMouseEnter={() => setHovered(type)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full transition-opacity"
              style={{ backgroundColor: TOKEN_TYPE_META[type].colorVar, opacity: hovered && hovered !== type ? 0.45 : 1 }}
            />
            <span className="text-foreground">{TOKEN_TYPE_META[type].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
