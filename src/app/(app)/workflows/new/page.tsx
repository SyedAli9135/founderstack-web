"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAgents } from "@/hooks/useAgents";
import { useCreateWorkflow } from "@/hooks/useWorkflows";
import { WorkflowTriggerType } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at 9am", value: "0 9 * * *" },
  { label: "Every Monday at 9am", value: "0 9 * * 1" },
  { label: "Custom", value: "custom" },
];

export default function NewWorkflowPage() {
  const router = useRouter();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const createMutation = useCreateWorkflow();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("");
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>("manual");
  const [cronPreset, setCronPreset] = useState(CRON_PRESETS[1].value);
  const [customCron, setCustomCron] = useState("");
  const [taskInputTemplate, setTaskInputTemplate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveCron = cronPreset === "custom" ? customCron : cronPreset;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agentId) {
      setError("Select an agent for this workflow to run");
      return;
    }
    if (triggerType === "scheduled" && !effectiveCron.trim()) {
      setError("Enter a cron expression, or pick a preset");
      return;
    }

    const minutes = estimatedMinutes ? parseInt(estimatedMinutes, 10) : undefined;
    if (minutes !== undefined && (Number.isNaN(minutes) || minutes <= 0)) {
      setError("Estimated manual minutes must be a positive number");
      return;
    }

    createMutation.mutate(
      {
        agent_id: agentId,
        name,
        description: description || undefined,
        trigger_type: triggerType,
        cron_expression: triggerType === "scheduled" ? effectiveCron : undefined,
        requires_approval: requiresApproval,
        task_input_template: taskInputTemplate || undefined,
        estimated_manual_minutes: minutes,
      },
      {
        onSuccess: (workflow) => {
          const nextRun = workflow.next_run_at
            ? new Date(workflow.next_run_at).toLocaleString()
            : null;
          toast.success("Workflow created", {
            description: nextRun ? `Next run: ${nextRun}` : undefined,
          });
          router.push("/workflows");
        },
        onError: (err) => setError(err.message),
      }
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="border-b border-border pb-6">
        <h1 className="text-xl font-semibold tracking-tight">New workflow</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an agent and a trigger — run it on demand, or on a schedule.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wf-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Name
            </label>
            <input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Weekly PR Digest"
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div>
            <label htmlFor="wf-agent" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Agent
            </label>
            <select
              id="wf-agent"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              required
              disabled={agentsLoading}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="" disabled>
                {agentsLoading ? "Loading…" : "Select an agent"}
              </option>
              {(agents ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {!agentsLoading && (agents ?? []).length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                No agents yet — create one first.
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="wf-description" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Description <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <input
            id="wf-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this workflow do?"
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Trigger</label>
          <div className="flex gap-2">
            {(["manual", "scheduled", "webhook"] as WorkflowTriggerType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTriggerType(t)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
                  triggerType === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:bg-accent/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {triggerType === "scheduled" && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div>
              <label htmlFor="wf-cron-preset" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Schedule
              </label>
              <select
                id="wf-cron-preset"
                value={cronPreset}
                onChange={(e) => setCronPreset(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                {CRON_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {cronPreset === "custom" && (
              <div>
                <label htmlFor="wf-cron-custom" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Cron expression
                </label>
                <input
                  id="wf-cron-custom"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="0 9 * * 1"
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Standard 5-field crontab format (minute hour day month weekday).
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="wf-task-input" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Task input <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <textarea
            id="wf-task-input"
            value={taskInputTemplate}
            onChange={(e) => setTaskInputTemplate(e.target.value)}
            rows={4}
            placeholder="Default instructions seeded into every run, e.g. 'Summarize this week's Slack activity.'"
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wf-minutes" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Manual time this takes (minutes) <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              id="wf-minutes"
              type="number"
              min={1}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="30"
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="flex items-end pb-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-input"
              />
              Require approval for high-risk actions
            </label>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={() => router.push("/workflows")}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create workflow"}
          </Button>
        </div>
      </form>
    </div>
  );
}
