"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAgents } from "@/hooks/useAgents";
import { useCreateAgentTeam } from "@/hooks/useAgentTeams";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Plus, X } from "lucide-react";

interface MemberRow {
  agentId: string;
  role: string;
}

export default function NewAgentTeamPage() {
  const router = useRouter();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const createMutation = useCreateAgentTeam();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orchestratorAgentId, setOrchestratorAgentId] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([{ agentId: "", role: "" }]);
  const [error, setError] = useState<string | null>(null);

  const addMember = () => setMembers((m) => [...m, { agentId: "", role: "" }]);
  const removeMember = (i: number) => setMembers((m) => m.filter((_, idx) => idx !== i));
  const updateMember = (i: number, patch: Partial<MemberRow>) =>
    setMembers((m) => m.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orchestratorAgentId) {
      setError("Select an orchestrator agent");
      return;
    }
    const validMembers = members.filter((m) => m.agentId && m.role.trim());
    if (validMembers.length === 0) {
      setError("Add at least one specialist, with an agent and a role");
      return;
    }
    const roles = validMembers.map((m) => m.role.trim().toLowerCase());
    if (new Set(roles).size !== roles.length) {
      setError("Every specialist needs a distinct role — the orchestrator dispatches by role");
      return;
    }

    createMutation.mutate(
      {
        name,
        description: description || undefined,
        orchestrator_agent_id: orchestratorAgentId,
        members: validMembers.map((m) => ({ agent_id: m.agentId, role: m.role.trim() })),
      },
      {
        onSuccess: (team) => router.push(`/agents/teams/${team.id}`),
        onError: (err) => setError(err.message),
      }
    );
  };

  const agentOptions = agents ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="border-b border-border pb-6">
        <h1 className="text-xl font-semibold tracking-tight">New agent team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an orchestrator, then add the specialists it can delegate subtasks to — each needs
          its own role (e.g. &quot;finance&quot;, &quot;ops&quot;).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="team-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Name
          </label>
          <input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Board Prep Team"
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div>
          <label htmlFor="team-description" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Description <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <input
            id="team-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this team handle?"
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div>
          <label htmlFor="team-orchestrator" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Orchestrator agent
          </label>
          <select
            id="team-orchestrator"
            value={orchestratorAgentId}
            onChange={(e) => setOrchestratorAgentId(e.target.value)}
            required
            disabled={agentsLoading}
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="" disabled>
              {agentsLoading ? "Loading…" : "Select an agent"}
            </option>
            {agentOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Decomposes the founder&apos;s task and delegates it to the specialists below.
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Specialists</label>
            <Button type="button" size="xs" variant="ghost" onClick={addMember}>
              <Plus className="mr-1 h-3 w-3" />
              Add specialist
            </Button>
          </div>
          <div className="space-y-2">
            {members.map((member, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
                <select
                  value={member.agentId}
                  onChange={(e) => updateMember(i, { agentId: e.target.value })}
                  disabled={agentsLoading}
                  className="flex-1 rounded-md border border-input bg-background px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">{agentsLoading ? "Loading…" : "Select an agent"}</option>
                  {agentOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <input
                  value={member.role}
                  onChange={(e) => updateMember(i, { role: e.target.value })}
                  placeholder="Role, e.g. finance"
                  className="w-40 rounded-md border border-input bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(i)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent/60 hover:text-destructive"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!agentsLoading && agentOptions.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">No agents yet — create one first.</p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-6">
          <Button type="button" variant="ghost" onClick={() => router.push("/agents/teams")}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Create team
          </Button>
        </div>
      </form>
    </div>
  );
}
