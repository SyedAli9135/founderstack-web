"use client";

import { SopDetail, SopOverrides } from "@/lib/api/types";

const fieldClass =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

// Blank inputs mean "use the SOP's value" — only non-empty fields become
// overrides, so a client inherits later default changes for anything it
// didn't explicitly set.
export function OverridesFields({
  sop,
  value,
  onChange,
  idPrefix,
}: {
  sop: SopDetail;
  value: SopOverrides;
  onChange: (next: SopOverrides) => void;
  idPrefix: string;
}) {
  const scheduled = sop.workflow_config?.trigger_type === "scheduled";
  const setParam = (key: string, v: string) => {
    const params = { ...(value.params ?? {}) };
    if (v === "") delete params[key];
    else params[key] = v;
    onChange({ ...value, params: Object.keys(params).length ? params : undefined });
  };
  const num = (v: string) => (v === "" ? undefined : Number(v));

  return (
    <div className="space-y-3">
      {sop.parameters.map((p) => (
        <div key={p.key}>
          <label htmlFor={`${idPrefix}-${p.key}`} className="mb-1 block text-xs text-muted-foreground">
            {p.label || p.key} <code className="ml-1 text-[11px] text-muted-foreground/70">{`{{${p.key}}}`}</code>
          </label>
          <input
            id={`${idPrefix}-${p.key}`}
            value={value.params?.[p.key] ?? ""}
            onChange={(e) => setParam(p.key, e.target.value)}
            placeholder={p.default || "(empty)"}
            className={fieldClass}
          />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-cost`} className="mb-1 block text-xs text-muted-foreground">Max cost per run (USD)</label>
          <input
            id={`${idPrefix}-cost`}
            type="number"
            min={0.01}
            step={0.01}
            value={value.max_cost_per_run_usd ?? ""}
            onChange={(e) => onChange({ ...value, max_cost_per_run_usd: num(e.target.value) })}
            placeholder={sop.agent_config.policy_scope.max_cost_per_run_usd?.toString() ?? "—"}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-calls`} className="mb-1 block text-xs text-muted-foreground">Max tool calls</label>
          <input
            id={`${idPrefix}-calls`}
            type="number"
            min={1}
            value={value.max_tool_calls ?? ""}
            onChange={(e) => onChange({ ...value, max_tool_calls: num(e.target.value) })}
            placeholder={sop.agent_config.policy_scope.max_tool_calls?.toString() ?? "—"}
            className={fieldClass}
          />
        </div>
      </div>
      {scheduled && (
        <div>
          <label htmlFor={`${idPrefix}-cron`} className="mb-1 block text-xs text-muted-foreground">Schedule (cron)</label>
          <input
            id={`${idPrefix}-cron`}
            value={value.cron_expression ?? ""}
            onChange={(e) => onChange({ ...value, cron_expression: e.target.value || undefined })}
            placeholder={sop.workflow_config?.cron_expression}
            className={`${fieldClass} font-mono`}
          />
        </div>
      )}
      {sop.workflow_config && (
        <div>
          <label htmlFor={`${idPrefix}-approval`} className="mb-1 block text-xs text-muted-foreground">Approval for high-risk actions</label>
          <select
            id={`${idPrefix}-approval`}
            value={value.requires_approval === undefined ? "" : String(value.requires_approval)}
            onChange={(e) =>
              onChange({ ...value, requires_approval: e.target.value === "" ? undefined : e.target.value === "true" })
            }
            className={fieldClass}
          >
            <option value="">Use SOP setting ({sop.workflow_config.requires_approval ? "required" : "not required"})</option>
            <option value="true">Required</option>
            <option value="false">Not required</option>
          </select>
        </div>
      )}
    </div>
  );
}

// Strips empty values so a blank field never becomes an override.
export function cleanOverrides(o: SopOverrides): SopOverrides {
  const out: SopOverrides = {};
  if (o.params && Object.keys(o.params).length) out.params = o.params;
  if (o.max_cost_per_run_usd !== undefined && !Number.isNaN(o.max_cost_per_run_usd)) out.max_cost_per_run_usd = o.max_cost_per_run_usd;
  if (o.max_tool_calls !== undefined && !Number.isNaN(o.max_tool_calls)) out.max_tool_calls = o.max_tool_calls;
  if (o.cron_expression) out.cron_expression = o.cron_expression;
  if (o.requires_approval !== undefined) out.requires_approval = o.requires_approval;
  return out;
}
