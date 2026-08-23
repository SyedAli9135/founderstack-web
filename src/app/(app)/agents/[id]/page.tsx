"use client";

import { use } from "react";
import { useAgent } from "@/hooks/useAgents";
import { AgentForm } from "@/components/agents/AgentForm";
import { Loader2 } from "lucide-react";

export default function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: agent, isLoading, error } = useAgent(id);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-destructive">Could not load agent</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "Agent not found"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="border-b border-border pb-6">
        <h1 className="text-xl font-semibold tracking-tight">{agent.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {agent.is_active ? "Edit this agent's configuration." : "This agent has been deleted — its configuration is kept for run history."}
        </p>
      </div>

      <AgentForm agent={agent} />
    </div>
  );
}
