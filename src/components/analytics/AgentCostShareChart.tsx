"use client";

import { useMemo, useState } from "react";
import { AgentCostShareItem } from "@/lib/api/types";

// 4 fixed categorical slots + a 5th "Other" bucket for every agent beyond
// that — a 5th+ named agent is never a generated hue (the dataviz skill's
// "fold into Other" rule), and --chart-5 is reserved for exactly this
// muted/aggregate role rather than a 5th named identity.
const SLOT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const OTHER_COLOR = "var(--chart-5)";

function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function AgentCostShareChart({ items, isLoading }: { items?: AgentCostShareItem[]; isLoading?: boolean }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { rows, total } = useMemo(() => {
    const sorted = [...(items ?? [])].filter((i) => i.total_cost_usd > 0).sort((a, b) => b.total_cost_usd - a.total_cost_usd);
    const total = sorted.reduce((sum, i) => sum + i.total_cost_usd, 0);
    const top = sorted.slice(0, 4).map((item, i) => ({ ...item, color: SLOT_COLORS[i] }));
    const rest = sorted.slice(4);
    const rows = [...top];
    if (rest.length > 0) {
      rows.push({
        agent_name: `Other (${rest.length})`,
        total_cost_usd: rest.reduce((sum, i) => sum + i.total_cost_usd, 0),
        color: OTHER_COLOR,
      });
    }
    return { rows, total };
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        Loading agent cost share…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
        No agent spend recorded in the last 30 days.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Cost share by agent">
        {rows.map((row, i) => {
          const pct = total > 0 ? (row.total_cost_usd / total) * 100 : 0;
          return (
            <div
              key={row.agent_name}
              title={`${row.agent_name}: ${formatUSD(row.total_cost_usd)} (${pct.toFixed(1)}%)`}
              onMouseEnter={() => setHovered(row.agent_name)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: `${pct}%`,
                backgroundColor: row.color,
                marginLeft: i === 0 ? 0 : "2px",
                opacity: hovered && hovered !== row.agent_name ? 0.45 : 1,
              }}
              className="h-full transition-opacity"
            />
          );
        })}
      </div>

      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.agent_name}
            className="flex items-center gap-2 text-xs"
            onMouseEnter={() => setHovered(row.agent_name)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full transition-opacity"
              style={{ backgroundColor: row.color, opacity: hovered && hovered !== row.agent_name ? 0.45 : 1 }}
            />
            <span className="truncate text-foreground">{row.agent_name}</span>
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{formatUSD(row.total_cost_usd)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
