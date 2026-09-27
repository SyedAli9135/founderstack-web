"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SopForm, inputClass, labelClass } from "@/components/practice/SopForm";
import { useAgent } from "@/hooks/useAgents";
import { useWorkflows } from "@/hooks/useWorkflows";
import { useCreateSop } from "@/hooks/useSops";

const CATEGORIES = ["finance", "operations", "sales", "support", "hr", "marketing", "general"];

// Promote mode (?from_agent=<id>): the backend copies the agent (and an
// optional workflow of it) as version 1; parameters can be added afterwards
// by editing, which saves version 2.
function PromoteForm({ agentId }: { agentId: string }) {
  const router = useRouter();
  const { data: agent, isLoading } = useAgent(agentId);
  const { data: workflows } = useWorkflows();
  const create = useCreateSop();
  const [name, setName] = useState<string | null>(null);
  const [category, setCategory] = useState("operations");
  const [workflowId, setWorkflowId] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }
  if (!agent) {
    return <p className="text-sm text-destructive">Agent not found in this workspace.</p>;
  }
  const agentWorkflows = (workflows ?? []).filter((w) => w.agent_id === agent.id);
  const sopName = name ?? agent.name;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate(
      {
        name: sopName.trim(),
        category,
        source: { agent_id: agent.id, workflow_id: workflowId || undefined },
      },
      {
        onSuccess: (sop) => {
          toast.success(`${sop.name} added to your SOP library`);
          router.push(`/practice/sops/${sop.id}`);
        },
        onError: (err) =>
          setError(
            // The SOP enforces the agents API's own rules; an agent that
            // predates them (or was imported) needs fixing at the source.
            err.code === "SYSTEM_PROMPT_TOO_SHORT"
              ? `${agent.name}'s system prompt is under 50 characters — expand it on the agent's page first, then save it as a SOP.`
              : err.code === "NO_ALLOWED_TOOLS"
                ? `${agent.name} has no allowed tools — give it at least one on the agent's page first.`
                : err.message
          ),
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">
        Copies <span className="text-foreground">{agent.name}</span>’s configuration into your library as version 1.
        You can add client parameters afterwards.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="promote-name" className={labelClass}>SOP name</label>
          <input id="promote-name" value={sopName} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="promote-category" className={labelClass}>Category</label>
          <select id="promote-category" value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} capitalize`}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="promote-workflow" className={labelClass}>Include a workflow</label>
        <select id="promote-workflow" value={workflowId} onChange={(e) => setWorkflowId(e.target.value)} className={inputClass}>
          <option value="">No workflow — agent only</option>
          {agentWorkflows.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={create.isPending || !sopName.trim()} className="gap-1.5">
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save as SOP
        </Button>
      </div>
    </form>
  );
}

function NewSopContent() {
  const router = useRouter();
  const fromAgent = useSearchParams().get("from_agent");
  const create = useCreateSop();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/practice/sops" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> SOP Library
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{fromAgent ? "Save agent as SOP" : "New SOP"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fromAgent
            ? "Turn an agent you've already tuned into a playbook you can deploy to every client."
            : "One agent, an optional workflow, and the parameters each client can adjust."}
        </p>
      </div>
      {fromAgent ? (
        <PromoteForm agentId={fromAgent} />
      ) : (
        <SopForm
          pending={create.isPending}
          submitLabel="Create SOP"
          serverError={create.error?.message}
          onCancel={() => router.push("/practice/sops")}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (sop) => {
                toast.success(`${sop.name} created`);
                router.push(`/practice/sops/${sop.id}`);
              },
            })
          }
        />
      )}
    </div>
  );
}

// useSearchParams needs a Suspense boundary for static prerendering.
export default function NewSopPage() {
  return (
    <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}>
      <NewSopContent />
    </Suspense>
  );
}
