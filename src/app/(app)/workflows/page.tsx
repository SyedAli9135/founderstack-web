"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkflows, useUpdateWorkflow, useDeleteWorkflow, useRunWorkflow } from "@/hooks/useWorkflows";
import { usePermissions } from "@/hooks/useTeam";
import { Workflow } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import {
  Workflow as WorkflowIcon,
  Loader2,
  Plus,
  Play,
  Trash2,
  Clock,
  Hand,
  Webhook,
} from "lucide-react";

const triggerMeta: Record<Workflow["trigger_type"], { label: string; icon: typeof Clock }> = {
  scheduled: { label: "Scheduled", icon: Clock },
  manual: { label: "Manual", icon: Hand },
  webhook: { label: "Webhook", icon: Webhook },
};

function formatNextRun(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function WorkflowCard({
  workflow,
  canTrigger,
  canModify,
}: {
  workflow: Workflow;
  canTrigger: boolean;
  canModify: boolean;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const router = useRouter();
  const updateMutation = useUpdateWorkflow();
  const deleteMutation = useDeleteWorkflow();
  const runMutation = useRunWorkflow();

  const TriggerIcon = triggerMeta[workflow.trigger_type].icon;
  const nextRun = formatNextRun(workflow.next_run_at);

  return (
    <div className="flex min-h-[176px] flex-col justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-foreground">
            <WorkflowIcon className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <TriggerIcon className="h-3 w-3" />
              {triggerMeta[workflow.trigger_type].label}
            </span>
            {canModify ? (
              <button
                type="button"
                role="switch"
                aria-checked={workflow.is_active}
                onClick={() => updateMutation.mutate({ id: workflow.id, input: { is_active: !workflow.is_active } })}
                disabled={updateMutation.isPending}
                title={workflow.is_active ? "Pause" : "Resume"}
                className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
                  workflow.is_active ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-background transition-transform ${
                    workflow.is_active ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            ) : (
              <span
                title={workflow.is_active ? "Active" : "Paused"}
                className={`h-4 w-7 shrink-0 rounded-full ${
                  workflow.is_active ? "bg-primary/50" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        </div>

        <h4 className="text-sm font-medium text-foreground">{workflow.name}</h4>
        <p className="mt-1 text-xs text-muted-foreground">Agent: {workflow.agent_name}</p>
        {nextRun && (
          <p className="mt-1 text-xs text-muted-foreground">Next run: {nextRun}</p>
        )}
        {workflow.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {workflow.description}
          </p>
        )}
      </div>

      <div className="mt-4">
        {confirmingDelete ? (
          <div className="flex justify-end gap-2">
            <Button size="xs" variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              size="xs"
              variant="destructive"
              onClick={() => deleteMutation.mutate(workflow.id, { onSuccess: () => setConfirmingDelete(false) })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            {canModify && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Delete"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {!canModify && !canTrigger && <span className="text-xs text-muted-foreground">View only</span>}
            {canTrigger && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  runMutation.mutate(workflow.id, {
                    onSuccess: (data) => router.push(`/runs/${data.run_id}`),
                  })
                }
                disabled={runMutation.isPending}
              >
                {runMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Play className="mr-1.5 h-3 w-3" />
                    Run now
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const { data: workflows, isLoading, error } = useWorkflows();
  const { canTriggerWorkflows, canModifyWorkflows } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-destructive">Could not load workflows</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const items = workflows ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule an agent to run on its own, or trigger it manually whenever you need it.
          </p>
        </div>
        {canModifyWorkflows && (
          <Link href="/workflows/new">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              New workflow
            </Button>
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <WorkflowIcon className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No workflows yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Pick an agent and a trigger — a schedule, or just run it on demand.
          </p>
          {canModifyWorkflows && (
            <Link href="/workflows/new">
              <Button size="sm" variant="outline" className="mt-2">
                New workflow
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              canTrigger={canTriggerWorkflows}
              canModify={canModifyWorkflows}
            />
          ))}
        </div>
      )}
    </div>
  );
}
