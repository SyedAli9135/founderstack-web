"use client";

import { useMemo, useState } from "react";
import { CostType, RunCostItem } from "@/lib/api/types";

// Color follows the entity (cost_type), never its rank/position within a
// given run — see the dataviz skill's "value-ramp on nominal categories"
// anti-pattern. Fixed categorical order, not sorted-then-colored.
const COST_TYPE_META: Record<CostType, { label: string; colorVar: string }> = {
  llm_inference: { label: "LLM inference", colorVar: "var(--chart-1)" },
  tool_call: { label: "Tool calls", colorVar: "var(--chart-2)" },
  embedding: { label: "Embeddings", colorVar: "var(--chart-3)" },
  reranking: { label: "Reranking", colorVar: "var(--chart-4)" },
};

function formatUSD(n: number): string {
  return `$${n.toFixed(4)}`;
}

/** A horizontal segmented bar, not a donut — WORKFLOW_PLAN_GO.md's Workflow
 * 11 spec calls for a donut chart, but with only 2-4 part-to-whole
 * categories (the dataviz skill explicitly flags pie/donut as the weaker
 * choice for that shape, preferring a stacked bar + legend), and this app's
 * own component set has never carried a pie/donut before. Read the same
 * $ and % information, with less chart chrome. "You paid" is deliberately
 * provider-neutral (not "You paid Anthropic," the plan's original wording)
 * since BYOK spans 5 providers here, not just Anthropic — see
 * project_founderstack_agent_architecture memory / CLAUDE.md's BYOK section. */
export function CostBreakdown({
  items,
  totalUSD,
  isLoading,
}: {
  items?: RunCostItem[];
  totalUSD?: number;
  isLoading?: boolean;
}) {
  const [hovered, setHovered] = useState<CostType | null>(null);

  const rows = useMemo(() => {
    if (!items || !totalUSD) return [];
    return [...items]
      .filter((item) => item.total_usd > 0)
      .sort((a, b) => b.total_usd - a.total_usd)
      .map((item) => ({
        ...item,
        meta: COST_TYPE_META[item.cost_type] ?? { label: item.cost_type, colorVar: "var(--muted-foreground)" },
        pct: totalUSD > 0 ? (item.total_usd / totalUSD) * 100 : 0,
      }));
  }, [items, totalUSD]);

  if (isLoading) {
    return (
      <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        Loading cost breakdown…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
        No cost recorded for this run.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* the bar: rounded outer ends, a 2px surface-color gap between segments */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Cost breakdown by type">
        {rows.map((row, i) => (
          <div
            key={row.cost_type}
            title={`${row.meta.label}: ${formatUSD(row.total_usd)} (${row.pct.toFixed(1)}%)`}
            onMouseEnter={() => setHovered(row.cost_type)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: `${row.pct}%`,
              backgroundColor: row.meta.colorVar,
              marginLeft: i === 0 ? 0 : "2px",
              opacity: hovered && hovered !== row.cost_type ? 0.45 : 1,
            }}
            className="h-full transition-opacity"
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.cost_type}
            className="flex items-center gap-1.5 text-xs"
            onMouseEnter={() => setHovered(row.cost_type)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full transition-opacity"
              style={{ backgroundColor: row.meta.colorVar, opacity: hovered && hovered !== row.cost_type ? 0.45 : 1 }}
            />
            <span className="text-foreground">{row.meta.label}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">{row.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>

      <p className="border-t border-border pt-2 text-sm">
        <span className="text-muted-foreground">You paid: </span>
        <span className="font-medium tabular-nums text-foreground">{formatUSD(totalUSD ?? 0)}</span>
        <span className="text-muted-foreground"> — billed directly by your BYOK provider.</span>
      </p>
    </div>
  );
}
