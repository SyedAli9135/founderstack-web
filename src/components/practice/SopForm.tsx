"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSopTools } from "@/hooks/useSops";
import { SopDetail, SopInput, SopParameter, WorkflowTriggerType } from "@/lib/api/types";

const MIN_SYSTEM_PROMPT_LEN = 50;
const DEFAULT_MODEL = "claude-sonnet-5";
const CATEGORIES = ["finance", "operations", "sales", "support", "hr", "marketing", "general"];
const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at 9am", value: "0 9 * * *" },
  { label: "Every Monday at 9am", value: "0 9 * * 1" },
  { label: "Custom", value: "custom" },
];
const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;
const KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

export const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";
export const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

function placeholdersIn(...texts: string[]): string[] {
  const keys = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(PLACEHOLDER)) keys.add(m[1]);
  return [...keys];
}

interface SopFormProps {
  sop?: SopDetail; // present = editing (saves a new version)
  pending: boolean;
  submitLabel: string;
  onSubmit: (input: SopInput) => void;
  onCancel: () => void;
  serverError?: string | null;
}

export function SopForm({ sop, pending, submitLabel, onSubmit, onCancel, serverError }: SopFormProps) {
  const isEditing = !!sop;
  const wf = sop?.workflow_config;
  const initialCron = wf?.cron_expression ?? CRON_PRESETS[2].value;
  const initialPreset = CRON_PRESETS.some((p) => p.value === initialCron) ? initialCron : "custom";

  const [name, setName] = useState(sop?.name ?? "");
  const [category, setCategory] = useState(sop?.category ?? "operations");
  const [description, setDescription] = useState(sop?.description ?? "");
  const [params, setParams] = useState<SopParameter[]>(sop?.parameters ?? []);

  const [agentName, setAgentName] = useState(sop?.agent_config.name ?? "");
  const [model, setModel] = useState(sop?.agent_config.model ?? DEFAULT_MODEL);
  const [systemPrompt, setSystemPrompt] = useState(sop?.agent_config.system_prompt ?? "");
  const [maxToolCalls, setMaxToolCalls] = useState(sop?.agent_config.policy_scope.max_tool_calls?.toString() ?? "20");
  const [maxCost, setMaxCost] = useState(sop?.agent_config.policy_scope.max_cost_per_run_usd?.toString() ?? "2.00");
  const [tools, setTools] = useState<Set<string>>(new Set(sop?.agent_config.policy_scope.allowed_tools ?? []));

  const [withWorkflow, setWithWorkflow] = useState(isEditing ? !!wf : true);
  const [wfName, setWfName] = useState(wf?.name ?? "");
  const [trigger, setTrigger] = useState<WorkflowTriggerType>(wf?.trigger_type ?? "scheduled");
  const [cronPreset, setCronPreset] = useState(initialPreset);
  const [customCron, setCustomCron] = useState(initialPreset === "custom" ? initialCron : "");
  const [taskInput, setTaskInput] = useState(wf?.task_input_template ?? "");
  const [minutes, setMinutes] = useState(wf?.estimated_manual_minutes?.toString() ?? "");
  const [requiresApproval, setRequiresApproval] = useState(wf?.requires_approval ?? false);
  const [changelog, setChangelog] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Everything a deployment renders from. Editing only name/category/
  // description must not create a new version (which would flag every
  // client "update available" for nothing), so config is sent only when
  // this differs from what the form opened with.
  const configKey = JSON.stringify([
    params, agentName, model, systemPrompt, maxToolCalls, maxCost, [...tools].sort(),
    withWorkflow, wfName, trigger, cronPreset, customCron, taskInput, minutes, requiresApproval,
  ]);
  const [initialConfigKey] = useState(configKey);
  const configChanged = !isEditing || configKey !== initialConfigKey;

  const { data: catalog, isLoading: toolsLoading } = useSopTools();
  const toolsByService = useMemo(
    () =>
      (catalog ?? []).reduce<Record<string, NonNullable<typeof catalog>>>((acc, t) => {
        (acc[t.service] ??= []).push(t);
        return acc;
      }, {}),
    [catalog]
  );

  const declared = new Set(params.map((p) => p.key));
  const undeclared = placeholdersIn(systemPrompt, withWorkflow ? taskInput : "").filter((k) => !declared.has(k));

  const toggleTool = (id: string) =>
    setTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const updateParam = (i: number, patch: Partial<SopParameter>) =>
    setParams((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fail = (msg: string) => setError(msg);

    if (!name.trim()) return fail("Give the SOP a name");
    if (!agentName.trim()) return fail("Give the agent a name");
    if (systemPrompt.trim().length < MIN_SYSTEM_PROMPT_LEN)
      return fail(`System prompt must be at least ${MIN_SYSTEM_PROMPT_LEN} characters`);
    if (tools.size === 0) return fail("Select at least one allowed tool");
    for (const p of params) {
      if (!KEY_PATTERN.test(p.key))
        return fail(`Parameter "${p.key || "(empty)"}" must be lowercase letters, digits and underscores`);
    }
    if (new Set(params.map((p) => p.key)).size !== params.length) return fail("Parameter keys must be unique");
    if (undeclared.length > 0) return fail(`Declare {{${undeclared[0]}}} as a parameter, or remove it`);

    const cost = maxCost ? parseFloat(maxCost) : undefined;
    if (cost !== undefined && (Number.isNaN(cost) || cost <= 0)) return fail("Max cost per run must be positive");
    const calls = maxToolCalls ? parseInt(maxToolCalls, 10) : undefined;
    if (calls !== undefined && (Number.isNaN(calls) || calls <= 0)) return fail("Max tool calls must be positive");

    const cronExpr = cronPreset === "custom" ? customCron.trim() : cronPreset;
    if (withWorkflow) {
      if (!wfName.trim()) return fail("Give the workflow a name");
      if (trigger === "scheduled" && !cronExpr) return fail("Enter a cron expression, or pick a preset");
    }
    const mins = minutes ? parseInt(minutes, 10) : undefined;

    const input: SopInput = {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      parameters: params.map((p) => ({ key: p.key, label: p.label?.trim() || undefined, default: p.default })),
      agent_config: {
        name: agentName.trim(),
        model: model.trim() || undefined,
        system_prompt: systemPrompt,
        policy_scope: { allowed_tools: [...tools], max_tool_calls: calls, max_cost_per_run_usd: cost },
      },
    };
    if (withWorkflow) {
      input.workflow_config = {
        name: wfName.trim(),
        trigger_type: trigger,
        cron_expression: trigger === "scheduled" ? cronExpr : undefined,
        requires_approval: requiresApproval,
        task_input_template: taskInput.trim() || undefined,
        estimated_manual_minutes: mins,
      };
    } else if (isEditing && wf) {
      input.remove_workflow = true;
    }
    if (isEditing && changelog.trim()) input.changelog = changelog.trim();
    if (!configChanged) {
      delete input.agent_config;
      delete input.workflow_config;
      delete input.parameters;
      delete input.remove_workflow;
      delete input.changelog;
    }
    onSubmit(input);
  };

  const shownError = error ?? serverError;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="sop-name" className={labelClass}>SOP name</label>
            <input id="sop-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} placeholder="Weekly Financial Close" className={inputClass} />
          </div>
          <div>
            <label htmlFor="sop-category" className={labelClass}>Category</label>
            <select id="sop-category" value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} capitalize`}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="sop-description" className={labelClass}>
            Description <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <input id="sop-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this playbook does for a client" className={inputClass} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Parameters</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Values each client can override. Use <code className="rounded bg-muted px-1">{"{{key}}"}</code> in the system prompt or task input.
            </p>
          </div>
          <Button type="button" variant="outline" size="xs" className="gap-1" onClick={() => setParams((p) => [...p, { key: "", label: "", default: "" }])}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        {params.length === 0 ? (
          <p className="text-xs text-muted-foreground">No parameters — every client gets identical config.</p>
        ) : (
          <div className="space-y-2">
            {params.map((p, i) => (
              // Stacked on phones (three inputs side by side are ~75px each
              // at 390px wide); one row from the sm breakpoint up.
              <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:border-0 sm:p-0">
                <input aria-label="Parameter key" value={p.key} onChange={(e) => updateParam(i, { key: e.target.value })} placeholder="slack_channel" className={`${inputClass} font-mono text-xs`} />
                <input aria-label="Parameter label" value={p.label ?? ""} onChange={(e) => updateParam(i, { label: e.target.value })} placeholder="Slack channel" className={inputClass} />
                <input aria-label="Default value" value={p.default} onChange={(e) => updateParam(i, { default: e.target.value })} placeholder="#finance" className={inputClass} />
                <Button type="button" variant="ghost" size="sm" className="justify-self-end sm:h-10 sm:w-10 sm:px-0" aria-label="Remove parameter" onClick={() => setParams((prev) => prev.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-foreground">Agent</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sop-agent-name" className={labelClass}>Agent name</label>
            <input id="sop-agent-name" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Weekly Close Agent" className={inputClass} />
          </div>
          <div>
            <label htmlFor="sop-model" className={labelClass}>Model</label>
            <input id="sop-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder={DEFAULT_MODEL} className={inputClass} />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="sop-prompt" className="block text-xs font-medium text-muted-foreground">System prompt</label>
            <span className={`text-xs ${systemPrompt.trim().length < MIN_SYSTEM_PROMPT_LEN ? "text-destructive" : "text-muted-foreground"}`}>
              {systemPrompt.trim().length} / {MIN_SYSTEM_PROMPT_LEN} min
            </span>
          </div>
          <textarea id="sop-prompt" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={5} placeholder="You run the weekly financial close and post the summary to {{slack_channel}}..." className={`${inputClass} resize-y`} />
          {undeclared.length > 0 && (
            <p className="mt-1.5 text-xs text-amber-500">Undeclared: {undeclared.map((k) => `{{${k}}}`).join(", ")} — add them as parameters.</p>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Policy</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sop-max-calls" className={labelClass}>Max tool calls per run</label>
              <input id="sop-max-calls" type="number" min={1} value={maxToolCalls} onChange={(e) => setMaxToolCalls(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="sop-max-cost" className={labelClass}>Max cost per run (USD)</label>
              <input id="sop-max-cost" type="number" min={0.01} step={0.01} value={maxCost} onChange={(e) => setMaxCost(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Allowed tools</label>
            <p className="mb-2 text-xs text-muted-foreground">
              The full catalog — each client workspace shows which integrations it still needs to connect.
            </p>
            {toolsLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tool catalog…
              </div>
            ) : (
              <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-border p-3">
                {Object.entries(toolsByService).map(([service, serviceTools]) => (
                  <div key={service}>
                    <p className="mb-1 text-xs font-medium capitalize text-foreground">{service.replace(/_/g, " ")}</p>
                    <div className="space-y-1.5">
                      {serviceTools.map((t) => (
                        <label key={t.tool_id} className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-accent/40">
                          <input type="checkbox" checked={tools.has(t.tool_id)} onChange={() => toggleTool(t.tool_id)} className="mt-0.5 h-3.5 w-3.5 rounded border-input" />
                          <span className="text-sm">
                            <span className="text-foreground">{t.name}</span>
                            <span className="ml-1.5 text-xs text-muted-foreground">{t.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input type="checkbox" checked={withWorkflow} onChange={(e) => setWithWorkflow(e.target.checked)} className="h-3.5 w-3.5 rounded border-input" />
          Include a workflow
        </label>
        {withWorkflow && (
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div>
              <label htmlFor="sop-wf-name" className={labelClass}>Workflow name</label>
              <input id="sop-wf-name" value={wfName} onChange={(e) => setWfName(e.target.value)} placeholder="Weekly Close" className={inputClass} />
            </div>
            <div>
              <span className={labelClass}>Trigger</span>
              <div className="flex gap-2">
                {(["manual", "scheduled", "webhook"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrigger(t)}
                    className={`rounded-md border px-3 py-1.5 text-sm capitalize ${trigger === t ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {trigger === "scheduled" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sop-cron-preset" className={labelClass}>Default schedule</label>
                  <select id="sop-cron-preset" value={cronPreset} onChange={(e) => setCronPreset(e.target.value)} className={inputClass}>
                    {CRON_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                {cronPreset === "custom" && (
                  <div>
                    <label htmlFor="sop-cron-custom" className={labelClass}>Cron expression</label>
                    <input id="sop-cron-custom" value={customCron} onChange={(e) => setCustomCron(e.target.value)} placeholder="0 9 * * 1" className={`${inputClass} font-mono`} />
                  </div>
                )}
              </div>
            )}
            <div>
              <label htmlFor="sop-task" className={labelClass}>
                Task input <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <textarea id="sop-task" value={taskInput} onChange={(e) => setTaskInput(e.target.value)} rows={2} placeholder="Close the week and post to {{slack_channel}}" className={`${inputClass} resize-y`} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sop-minutes" className={labelClass}>Manual time this takes (minutes)</label>
                <input id="sop-minutes" type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="90" className={inputClass} />
              </div>
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-foreground">
                <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} className="h-3.5 w-3.5 rounded border-input" />
                Require approval for high-risk actions
              </label>
            </div>
          </div>
        )}
      </section>

      {isEditing && (
        <div>
          <label htmlFor="sop-changelog" className={labelClass}>
            What changed? <span className="text-muted-foreground/60">(shown in version history)</span>
          </label>
          <input id="sop-changelog" value={changelog} onChange={(e) => setChangelog(e.target.value)} placeholder="Flag payments over $10k" className={inputClass} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {configChanged
              ? `Saves version ${(sop?.current_version ?? 0) + 1}. Clients stay on their current version until you sync them.`
              : "Only name, category and description changed — no new version."}
          </p>
        </div>
      )}

      {shownError && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{shownError}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={pending} className="gap-1.5">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
