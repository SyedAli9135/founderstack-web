"use client";

import { useState } from "react";
import Link from "next/link";
import { useAgents, useDeleteAgent } from "@/hooks/useAgents";
import { Agent } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Bot, Loader2, Plus, Pencil, Trash2 } from "lucide-react";

function AgentCard({ agent }: { agent: Agent }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useDeleteAgent();

  return (
    <div className="flex min-h-[176px] flex-col justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
              {agent.agent_type}
            </span>
            <span
              className={`h-2 w-2 rounded-full ${agent.is_active ? "bg-primary" : "bg-muted-foreground/40"}`}
              title={agent.is_active ? "Active" : "Inactive"}
            />
          </div>
        </div>

        <h4 className="text-sm font-medium text-foreground">{agent.name}</h4>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {agent.description || agent.system_prompt}
        </p>
      </div>

      <div className="mt-4">
        {confirmingDelete ? (
          <div className="space-y-2">
            {agent.workflow_count > 0 && (
              <p className="text-xs text-destructive">
                {agent.workflow_count} workflow{agent.workflow_count === 1 ? "" : "s"} use{agent.workflow_count === 1 ? "s" : ""} this agent.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="xs"
                variant="destructive"
                onClick={() => deleteMutation.mutate(agent.id, { onSuccess: () => setConfirmingDelete(false) })}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Delete"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Link href={`/agents/${agent.id}`}>
              <Button size="sm" variant="outline">
                <Pencil className="mr-1.5 h-3 w-3" />
                Edit
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useAgents();

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
        <p className="text-sm font-medium text-destructive">Could not load agents</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const items = agents ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure who does what — name, instructions, and which tools each agent can use.
          </p>
        </div>
        <Link href="/agents/new">
          <Button>
            <Plus className="mr-1.5 h-4 w-4" />
            New agent
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <Bot className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No agents yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Create your first agent — give it a system prompt and a set of tools it&apos;s allowed
            to use.
          </p>
          <Link href="/agents/new">
            <Button size="sm" variant="outline" className="mt-2">
              New agent
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
