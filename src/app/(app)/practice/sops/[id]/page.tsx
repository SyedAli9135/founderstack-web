"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { AlertCircle, ArrowLeft, Loader2, Pencil, RefreshCw, Rocket, SlidersHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SopForm } from "@/components/practice/SopForm";
import { DeploySopDialog } from "@/components/practice/DeploySopDialog";
import { ConfirmDialog } from "@/components/practice/ConfirmDialog";
import { OverridesFields, cleanOverrides } from "@/components/practice/OverridesFields";
import {
  useDeleteSop,
  useSop,
  useSopDeployments,
  useSops,
  useSyncDeployment,
  useUndeploySop,
  useUpdateDeploymentOverrides,
  useUpdateSop,
} from "@/hooks/useSops";
import { SopDeployment, SopDeploymentStatus, SopDetail, SopOverrides } from "@/lib/api/types";

const statusStyle: Record<SopDeploymentStatus, { label: string; className: string }> = {
  up_to_date: { label: "Up to date", className: "border-primary/30 text-primary" },
  update_available: { label: "Update available", className: "border-amber-500/30 text-amber-500" },
  broken: { label: "Agent removed", className: "border-destructive/30 text-destructive" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function overrideSummary(o: SopOverrides): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(o.params ?? {})) parts.push(`${k}: ${v}`);
  if (o.max_cost_per_run_usd !== undefined) parts.push(`cost cap $${o.max_cost_per_run_usd}`);
  if (o.max_tool_calls !== undefined) parts.push(`${o.max_tool_calls} tool calls`);
  if (o.cron_expression) parts.push(`schedule ${o.cron_expression}`);
  if (o.requires_approval !== undefined) parts.push(o.requires_approval ? "approval on" : "approval off");
  return parts.join(" · ");
}

function EditOverridesDialog({
  sop,
  deployment,
  onClose,
}: {
  sop: SopDetail;
  deployment: SopDeployment | null;
  onClose: () => void;
}) {
  const update = useUpdateDeploymentOverrides(sop.id);
  const [value, setValue] = useState<SopOverrides | null>(null);
  const current = value ?? deployment?.parameter_overrides ?? {};

  const close = () => {
    setValue(null);
    update.reset();
    onClose();
  };

  return (
    <Dialog.Root open={!!deployment} onOpenChange={(o) => !o && !update.isPending && close()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-lg outline-none transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <Dialog.Title className="text-base font-semibold">Overrides for {deployment?.workspace_name}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Applied now, at the version this client is on (v{deployment?.deployed_version}), and kept through future syncs.
          </Dialog.Description>
          <div className="mt-4">
            {deployment && <OverridesFields sop={sop} idPrefix={`edit-${deployment.id}`} value={current} onChange={setValue} />}
          </div>
          {update.error && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {update.error.message}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={update.isPending}>Cancel</Button>
            <Button
              className="gap-1.5"
              disabled={update.isPending}
              onClick={() =>
                deployment &&
                update.mutate(
                  { deployment, overrides: cleanOverrides(current) },
                  {
                    onSuccess: () => {
                      toast.success(`Overrides saved for ${deployment.workspace_name}`);
                      close();
                    },
                  }
                )
              }
            >
              {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save overrides
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ConfigView({ sop }: { sop: SopDetail }) {
  const a = sop.agent_config;
  const w = sop.workflow_config;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent</h3>
        <p className="mt-2 text-sm font-medium text-foreground">{a.name}</p>
        <p className="text-xs text-muted-foreground">
          {a.model || "claude-sonnet-5"}
          {a.policy_scope.max_cost_per_run_usd !== undefined && ` · $${a.policy_scope.max_cost_per_run_usd} per run max`}
          {a.policy_scope.max_tool_calls !== undefined && ` · ${a.policy_scope.max_tool_calls} tool calls max`}
        </p>
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs text-foreground">{a.system_prompt}</pre>
        <p className="mt-3 text-xs text-muted-foreground">Tools: {a.policy_scope.allowed_tools.join(", ")}</p>
      </div>
      {w && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workflow</h3>
          <p className="mt-2 text-sm font-medium text-foreground">{w.name}</p>
          <p className="text-xs text-muted-foreground">
            <span className="capitalize">{w.trigger_type}</span>
            {w.cron_expression && ` · ${w.cron_expression}`}
            {w.requires_approval && " · approval required"}
            {w.estimated_manual_minutes ? ` · saves ~${w.estimated_manual_minutes} min per run` : ""}
          </p>
          {w.task_input_template && (
            <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs text-foreground">{w.task_input_template}</pre>
          )}
        </div>
      )}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Parameters</h3>
        {sop.parameters.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">None — every client gets identical config.</p>
        ) : (
          <div className="mt-2 divide-y divide-border text-sm">
            {sop.parameters.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-4 py-2">
                <span>
                  <span className="text-foreground">{p.label || p.key}</span>{" "}
                  <code className="text-xs text-muted-foreground">{`{{${p.key}}}`}</code>
                </span>
                <span className="text-xs text-muted-foreground">default: {p.default || "(empty)"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: sop, isLoading, error } = useSop(id);
  const { data: deps } = useSopDeployments(id);
  const { data: library } = useSops();
  const update = useUpdateSop(id);
  const del = useDeleteSop();
  const sync = useSyncDeployment(id);
  const undeploy = useUndeploySop(id);

  const [editing, setEditing] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removing, setRemoving] = useState<SopDeployment | null>(null);
  const [editingOverrides, setEditingOverrides] = useState<SopDeployment | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !sop) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-base font-semibold">SOP not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error?.message ?? "It may have been removed from the library."}</p>
      </div>
    );
  }

  const canManage = library?.can_manage ?? false;
  const deployments = deps?.deployments ?? [];
  const outdated = deployments.filter((d) => d.status === "update_available");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href="/practice/sops" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> SOP Library
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{sop.name}</h1>
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">v{sop.current_version}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="capitalize">{sop.category}</span>
              {sop.description && ` · ${sop.description}`}
            </p>
            {sop.required_integrations.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Needs <span className="capitalize">{sop.required_integrations.join(", ")}</span> connected in each client
              </p>
            )}
          </div>
          {canManage && !editing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setDeployOpen(true)}>
                <Rocket className="h-4 w-4" /> Deploy
              </Button>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="rounded-lg border border-border p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-medium">Edit SOP</h2>
            <Button variant="ghost" size="icon" aria-label="Close editor" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SopForm
            sop={sop}
            pending={update.isPending}
            submitLabel="Save"
            serverError={update.error?.message}
            onCancel={() => setEditing(false)}
            onSubmit={(input) =>
              update.mutate(input, {
                onSuccess: (updated) => {
                  toast.success(
                    updated.current_version > sop.current_version ? `Saved as version ${updated.current_version}` : "Saved"
                  );
                  setEditing(false);
                },
              })
            }
          />
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Deployments</h2>
              {outdated.length > 0 && canManage && (
                <span className="text-xs text-amber-500">
                  {outdated.length} {outdated.length === 1 ? "client is" : "clients are"} on an older version
                </span>
              )}
            </div>
            {deployments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                Not deployed to any client yet.
              </div>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border bg-card">
                {deployments.map((d) => {
                  const st = statusStyle[d.status];
                  const summary = overrideSummary(d.parameter_overrides);
                  return (
                    <div key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm text-foreground">{d.workspace_name}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${st.className}`}>{st.label}</span>
                          <span className="text-xs text-muted-foreground">v{d.deployed_version}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {summary || "No overrides"} · synced {formatDate(d.synced_at)}
                        </p>
                        {d.missing_integrations.length > 0 && (
                          <p className="mt-0.5 text-xs text-amber-500">Needs {d.missing_integrations.join(", ")} connected</p>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          {d.status === "update_available" && (
                            <Button
                              variant="outline"
                              size="xs"
                              className="gap-1"
                              disabled={sync.isPending}
                              onClick={() => sync.mutate(d)}
                            >
                              {sync.isPending && sync.variables?.id === d.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              Sync to v{d.current_version}
                            </Button>
                          )}
                          {d.status !== "broken" && (
                            <Button variant="ghost" size="xs" className="gap-1" onClick={() => setEditingOverrides(d)}>
                              <SlidersHorizontal className="h-3 w-3" /> Overrides
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Remove from ${d.workspace_name}`}
                            onClick={() => setRemoving(d)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="mb-3 text-sm font-medium text-foreground">Configuration</h2>
              <ConfigView sop={sop} />
            </div>
            <div>
              <h2 className="mb-3 text-sm font-medium text-foreground">Version history</h2>
              <ol className="space-y-3 rounded-lg border border-border bg-card p-4">
                {sop.versions.map((v) => (
                  <li key={v.version} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">v{v.version}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(v.created_at)}</span>
                    </div>
                    {v.changelog && <p className="mt-0.5 text-xs text-muted-foreground">{v.changelog}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </>
      )}

      <DeploySopDialog
        sop={sop}
        deployedWorkspaceIds={new Set(deployments.map((d) => d.workspace_id))}
        open={deployOpen}
        onOpenChange={setDeployOpen}
      />
      <EditOverridesDialog sop={sop} deployment={editingOverrides} onClose={() => setEditingOverrides(null)} />
      <ConfirmDialog
        open={!!removing}
        title="Remove from client"
        description={
          <>
            This removes “{sop.name}” from {removing?.workspace_name}: its agent is deactivated and its workflow paused. Run history is kept.
          </>
        }
        confirmLabel="Remove"
        pending={undeploy.isPending}
        onOpenChange={(o) => !o && setRemoving(null)}
        onConfirm={() => removing && undeploy.mutate(removing, { onSettled: () => setRemoving(null) })}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete SOP"
        description={
          <>
            Removes “{sop.name}” from your library. The {deployments.length} deployed{" "}
            {deployments.length === 1 ? "copy keeps" : "copies keep"} running in client workspaces, but can no longer be synced.
          </>
        }
        confirmLabel="Delete SOP"
        pending={del.isPending}
        onOpenChange={setConfirmDelete}
        onConfirm={() =>
          del.mutate(sop.id, {
            onSuccess: () => {
              toast.success(`${sop.name} removed from library`);
              router.push("/practice/sops");
            },
          })
        }
      />
    </div>
  );
}
