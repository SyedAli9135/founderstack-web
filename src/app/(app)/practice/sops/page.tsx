"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSops } from "@/hooks/useSops";
import { SopSummary } from "@/lib/api/types";

function DeploymentBadge({ sop }: { sop: SopSummary }) {
  if (sop.active_deployments === 0) {
    return <span className="text-xs text-muted-foreground">Not deployed</span>;
  }
  const clients = `${sop.active_deployments} ${sop.active_deployments === 1 ? "client" : "clients"}`;
  if (sop.outdated_deployments > 0) {
    return (
      <span className="text-xs text-amber-500">
        {clients} · {sop.outdated_deployments} {sop.outdated_deployments === 1 ? "update" : "updates"} available
      </span>
    );
  }
  return <span className="text-xs text-primary">{clients} · all up to date</span>;
}

export default function SopLibraryPage() {
  const { data, isLoading, error } = useSops();

  if (isLoading) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-base font-semibold">SOP library unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.code === "NOT_A_PRACTICE_MEMBER"
            ? "This workspace belongs to a practice you're not a member of."
            : error.message}
        </p>
      </div>
    );
  }

  const sops = data!.sops;
  const canManage = data!.can_manage;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href="/practice" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Portfolio
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">SOP Library</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build a playbook once, deploy it to every client, and push improvements from one place.
            </p>
          </div>
          {canManage && (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/practice/sops/new">
                <Plus className="h-4 w-4" /> New SOP
              </Link>
            </Button>
          )}
        </div>
      </div>

      {sops.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">No SOPs yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              A SOP bundles an agent, an optional workflow, and the parameters each client can adjust — like their Slack channel or cost cap.
            </p>
          </div>
          {canManage && (
            <Button asChild size="sm" className="mt-1 gap-1.5">
              <Link href="/practice/sops/new">
                <Plus className="h-4 w-4" /> Create your first SOP
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sops.map((s) => (
            <Link
              key={s.id}
              href={`/practice/sops/${s.id}`}
              className="flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/20"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-medium text-foreground">{s.name}</h3>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">v{s.current_version}</span>
              </div>
              {s.category && <p className="mt-1 text-xs capitalize text-muted-foreground">{s.category}</p>}
              {s.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <p>
                  Agent: <span className="text-foreground">{s.agent_name}</span>
                </p>
                {s.workflow_name && (
                  <p>
                    Workflow: <span className="text-foreground">{s.workflow_name}</span>{" "}
                    <span className="capitalize">({s.trigger_type})</span>
                  </p>
                )}
                {s.required_integrations.length > 0 && (
                  <p>
                    Uses <span className="capitalize">{s.required_integrations.join(", ")}</span>
                  </p>
                )}
              </div>
              <div className="mt-auto pt-4">
                <div className="border-t border-border pt-3">
                  <DeploymentBadge sop={s} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
