"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientWorkspaces } from "@/hooks/usePortfolio";
import { useDeploySop } from "@/hooks/useSops";
import { SopDeployment, SopDetail, SopOverrides } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import { OverridesFields, cleanOverrides } from "./OverridesFields";

type Result = { ok: true; deployment: SopDeployment } | { ok: false; message: string };

export function DeploySopDialog({
  sop,
  deployedWorkspaceIds,
  open,
  onOpenChange,
}: {
  sop: SopDetail;
  deployedWorkspaceIds: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data } = useClientWorkspaces();
  const deploy = useDeploySop(sop.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, SopOverrides>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);

  const available = (data?.workspaces ?? []).filter((w) => w.status === "active" && !deployedWorkspaceIds.has(w.id));
  const done = Object.keys(results).length > 0 && !running;

  const reset = () => {
    setSelected(new Set());
    setExpanded(null);
    setOverrides({});
    setResults({});
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Sequential, so one workspace failing (e.g. an agent-name clash) is
  // reported on its own row without hiding the others' results.
  const run = async () => {
    setRunning(true);
    const out: Record<string, Result> = {};
    for (const id of selected) {
      try {
        const d = await deploy.mutateAsync({ target_org_id: id, parameter_overrides: cleanOverrides(overrides[id] ?? {}) });
        out[id] = { ok: true, deployment: d };
      } catch (err) {
        out[id] = { ok: false, message: err instanceof ApiError ? err.message : "Deploy failed" };
      }
      setResults({ ...out });
    }
    setRunning(false);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (running) return;
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-popover text-popover-foreground shadow-lg outline-none transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <div className="border-b border-border p-5">
            <Dialog.Title className="text-base font-semibold">Deploy “{sop.name}”</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Creates the agent{sop.workflow_config ? " and workflow" : ""} in each selected client workspace at version {sop.current_version}. Leave a field blank to use the SOP’s value.
            </Dialog.Description>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-5">
            {available.length === 0 && Object.keys(results).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Every active client workspace already runs this SOP.
              </p>
            ) : (
              (data?.workspaces ?? [])
                .filter((w) => available.some((a) => a.id === w.id) || results[w.id])
                .map((w) => {
                  const result = results[w.id];
                  const isOpen = expanded === w.id;
                  return (
                    <div key={w.id} className="rounded-md border border-border">
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Deploy to ${w.name}`}
                          checked={selected.has(w.id)}
                          disabled={running || done}
                          onChange={() => toggle(w.id)}
                          className="h-3.5 w-3.5 rounded border-input"
                        />
                        <span className="flex-1 truncate text-sm">{w.name}</span>
                        {result ? (
                          result.ok ? (
                            <span className="flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> Deployed</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" /> Failed</span>
                          )
                        ) : (
                          selected.has(w.id) && (
                            <button
                              type="button"
                              onClick={() => setExpanded(isOpen ? null : w.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Overrides <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                          )
                        )}
                      </div>
                      {result && !result.ok && <p className="border-t border-border px-3 py-2 text-xs text-destructive">{result.message}</p>}
                      {result?.ok && result.deployment.missing_integrations.length > 0 && (
                        <p className="border-t border-border px-3 py-2 text-xs text-amber-500">
                          Connect {result.deployment.missing_integrations.join(", ")} in {w.name} for this agent to run.
                        </p>
                      )}
                      {isOpen && !result && (
                        <div className="border-t border-border p-3">
                          <OverridesFields
                            sop={sop}
                            idPrefix={`deploy-${w.id}`}
                            value={overrides[w.id] ?? {}}
                            onChange={(v) => setOverrides((prev) => ({ ...prev, [w.id]: v }))}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border p-4">
            {done ? (
              <Button onClick={() => { reset(); onOpenChange(false); }}>Done</Button>
            ) : (
              <>
                <Dialog.Close render={<Button variant="ghost" disabled={running} />}>Cancel</Dialog.Close>
                <Button onClick={run} disabled={running || selected.size === 0} className="gap-1.5">
                  {running && <Loader2 className="h-4 w-4 animate-spin" />}
                  {selected.size === 0
                    ? "Deploy"
                    : `Deploy to ${selected.size} ${selected.size === 1 ? "workspace" : "workspaces"}`}
                </Button>
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
