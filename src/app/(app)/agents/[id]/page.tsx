"use client";

import { use } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useAgent } from "@/hooks/useAgents";
import { useSops } from "@/hooks/useSops";
import { Button } from "@/components/ui/button";
import { AgentForm } from "@/components/agents/AgentForm";
import { Loader2 } from "lucide-react";

export default function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: agent, isLoading, error } = useAgent(id);
  // Only practice owners/admins can add to the SOP library.
  const { data: library } = useSops();

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
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{agent.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {agent.is_active ? "Edit this agent's configuration." : "This agent has been deleted — its configuration is kept for run history."}
          </p>
        </div>
        {agent.is_active && !agent.sop && library?.can_manage && (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/practice/sops/new?from_agent=${agent.id}`}>
              <BookOpen className="h-4 w-4" /> Save as SOP
            </Link>
          </Button>
        )}
      </div>

      {agent.sop && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <p className="text-foreground">
            Managed by the <span className="font-medium">{agent.sop.name}</span> SOP (v{agent.sop.version}).
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Edits here are replaced the next time the practice syncs this SOP. To change it for every client, edit the SOP instead.
          </p>
        </div>
      )}

      <AgentForm agent={agent} />
    </div>
  );
}
