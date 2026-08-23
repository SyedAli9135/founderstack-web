"use client";

import { AgentForm } from "@/components/agents/AgentForm";

export default function NewAgentPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="border-b border-border pb-6">
        <h1 className="text-xl font-semibold tracking-tight">New agent</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Give it a name, a system prompt, and the tools it&apos;s allowed to call.
        </p>
      </div>

      <AgentForm />
    </div>
  );
}
