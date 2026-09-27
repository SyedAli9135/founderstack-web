import { CheckCircle2, Clock, Workflow as WorkflowIcon } from "lucide-react";
import { ReportSnapshot } from "@/lib/api/types";

// One renderer for both the public share link and the operator's preview, so
// what the operator reviews is exactly what the client sees. A section
// renders only if it's present in the snapshot — hidden ones were never
// stored.

function formatDate(iso: string) {
  // Report dates are calendar days (YYYY-MM-DD); parse as local noon so no
  // timezone shift can move them a day.
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// In the report's own timezone (the one its window was computed in), so
// every client sees the same times regardless of where they open the link.
function formatDateTime(iso: string, timeZone: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  try {
    return new Date(iso).toLocaleString(undefined, { ...opts, timeZone });
  } catch {
    return new Date(iso).toLocaleString(undefined, opts);
  }
}

function formatHours(n: number) {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1);
}

function formatUSD(n: number) {
  if (n > 0 && n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

const statusStyle: Record<string, string> = {
  completed: "text-primary",
  failed: "text-destructive",
  cancelled: "text-muted-foreground",
};

export function ReportView({ title, snapshot }: { title: string; snapshot: ReportSnapshot }) {
  const s = snapshot.summary;
  const successRate = s.runs_total > 0 ? Math.round((s.runs_completed / s.runs_total) * 100) : null;
  const hero = [
    { label: "Hours saved", value: formatHours(s.hours_saved), icon: Clock },
    { label: "Tasks completed", value: s.runs_completed.toLocaleString(), icon: CheckCircle2 },
    { label: "Automations running", value: s.workflows_active.toLocaleString(), icon: WorkflowIcon },
  ];

  return (
    <article className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Prepared by {snapshot.prepared_by}
          {snapshot.prepared_by !== snapshot.client_name && <> for {snapshot.client_name}</>}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(snapshot.date_from)} – {formatDate(snapshot.date_to)}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {hero.map((h) => (
          <div key={h.label} className="rounded-lg border border-border bg-card p-5 print:border-neutral-300">
            <h.icon className="h-4 w-4 text-primary" />
            <p className="mt-3 text-3xl font-semibold tabular-nums text-foreground">{h.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{h.label}</p>
          </div>
        ))}
      </section>

      {successRate !== null && (
        <p className="text-sm text-muted-foreground">
          {s.runs_total.toLocaleString()} automated {s.runs_total === 1 ? "task" : "tasks"} ran this period —{" "}
          <span className="text-foreground">{successRate}% completed successfully</span>.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">What was automated</h2>
        {snapshot.workflows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No automations ran in this period.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Automation</th>
                  <th className="px-4 py-2 text-right font-medium">Completed</th>
                  <th className="px-4 py-2 text-right font-medium">Hours saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {snapshot.workflows.map((w) => (
                  <tr key={w.name}>
                    <td className="px-4 py-2.5 text-foreground">{w.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {w.runs_completed} / {w.runs_total}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{formatHours(w.hours_saved)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(snapshot.cost || snapshot.tokens) && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {snapshot.cost && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground">AI cost</h2>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{formatUSD(snapshot.cost.total_usd)}</p>
              {snapshot.cost.by_agent.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {snapshot.cost.by_agent.map((a) => (
                    <li key={a.agent_name} className="flex justify-between gap-4">
                      <span className="truncate text-muted-foreground">{a.agent_name}</span>
                      <span className="tabular-nums">{formatUSD(a.cost_usd)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {snapshot.tokens && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground">Tokens processed</h2>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{snapshot.tokens.total.toLocaleString()}</p>
              <dl className="mt-3 space-y-1.5 text-sm">
                {(["input", "output", "cached"] as const).map((k) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="capitalize text-muted-foreground">{k}</dt>
                    <dd className="tabular-nums">{snapshot.tokens![k].toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>
      )}

      {snapshot.runs && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            Activity log {snapshot.runs.length >= 200 && <span className="text-muted-foreground">(latest 200)</span>}
          </h2>
          {snapshot.runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs in this period.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">When</th>
                    <th className="px-4 py-2 text-left font-medium">Automation</th>
                    <th className="px-4 py-2 text-left font-medium">Result</th>
                    <th className="px-4 py-2 text-right font-medium">Hours saved</th>
                    {snapshot.runs.some((r) => r.cost_usd !== undefined) && <th className="px-4 py-2 text-right font-medium">Cost</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {snapshot.runs.map((r, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{formatDateTime(r.started_at, snapshot.timezone)}</td>
                      <td className="px-4 py-2 text-foreground">{r.workflow_name}</td>
                      <td className={`px-4 py-2 capitalize ${statusStyle[r.status] ?? "text-muted-foreground"}`}>{r.status.replace("_", " ")}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.hours_saved ? formatHours(r.hours_saved) : "—"}</td>
                      {r.cost_usd !== undefined && <td className="px-4 py-2 text-right tabular-nums">{formatUSD(r.cost_usd)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Generated {formatDateTime(snapshot.generated_at, snapshot.timezone)} · times in {snapshot.timezone}
      </p>
    </article>
  );
}
